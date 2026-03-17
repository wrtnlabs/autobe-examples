import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEcommerceMallShipmentDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentDelivery";
import { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallOrderCollector } from "../collectors/EcommerceMallOrderCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallOrderTransformer } from "../transformers/EcommerceMallOrderTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallCustomerCheckout(props: {
  customer: CustomerPayload;
  body: IEcommerceMallOrder.ICreate;
}): Promise<IEcommerceMallOrder> {
  // Step 1: Query cart items with variant and inventory data
  const cartItems = await MyGlobal.prisma.ecommerce_mall_cart_items.findMany({
    where: {
      customer_id: props.customer.id,
      deleted_at: null,
    },
    include: {
      productVariant: {
        include: {
          product: {
            include: {
              seller: true,
            },
          },
          inventoryRecords: true,
          variantOptions: true,
        },
      },
    },
  });
  // Step 2: Validate cart is not empty
  if (cartItems.length === 0) {
    throw new HttpException("Cart is empty", 400);
  }
  // Step 3: Check item availability and calculate stock/total
  type VariantOption = {
    id: string & tags.Format<"uuid">;
    optionName: string;
    optionValue: string;
  };
  type ProcessedCartItem = {
    cartItemId: string;
    quantity: number;
    variantId: string & tags.Format<"uuid">;
    skuCode: string;
    priceAtPurchase: number;
    productId: string & tags.Format<"uuid">;
    productName: string;
    productDescription: string;
    productBasePrice: number;
    categoryId: string & tags.Format<"uuid">;
    sellerId: string & tags.Format<"uuid">;
    sellerShopName: string;
    variantOptions: VariantOption[];
  };
  const processedItems: ProcessedCartItem[] = [];
  let totalPrice: number = 0;
  const unavailableItems: string[] = [];
  for (const item of cartItems) {
    const variant = item.productVariant;
    // Check variant is not deleted
    if (variant.deleted_at !== null) {
      unavailableItems.push(variant.sku_code);
      continue;
    }
    // Check seller approval status
    if (variant.product.seller.approval_status !== "approved") {
      unavailableItems.push(variant.sku_code);
      continue;
    }
    // Calculate current stock
    const stockSum = variant.inventoryRecords.reduce(
      (
        sum: number,
        record: {
          quantity_change: number;
        },
      ) => sum + record.quantity_change,
      0,
    );
    if (stockSum < item.quantity) {
      unavailableItems.push(variant.sku_code);
      continue;
    }
    // Use variant price or fall back to product base price
    const priceAtPurchase = variant.price ?? variant.product.base_price;
    totalPrice += priceAtPurchase * item.quantity;
    const variantId = variant.id as string & tags.Format<"uuid">;
    const productId = variant.product.id as string & tags.Format<"uuid">;
    const categoryId = variant.product.category_id as string &
      tags.Format<"uuid">;
    const sellerId = variant.product.seller.id as string & tags.Format<"uuid">;
    // Seller shop name not available in schema, use empty string
    const sellerShopName = "";
    const variantOptionsMapped: VariantOption[] = variant.variantOptions.map(
      (opt: { id: string; option_name: string; option_value: string }) => ({
        id: opt.id as string & tags.Format<"uuid">,
        optionName: opt.option_name,
        optionValue: opt.option_value,
      }),
    );
    const processedItem: ProcessedCartItem = {
      cartItemId: item.id,
      quantity: item.quantity,
      variantId,
      skuCode: variant.sku_code,
      priceAtPurchase,
      productId,
      productName: variant.product.name,
      productDescription: variant.product.description,
      productBasePrice: variant.product.base_price,
      categoryId,
      sellerId,
      sellerShopName,
      variantOptions: variantOptionsMapped,
    };
    processedItems.push(processedItem);
  }
  if (unavailableItems.length > 0) {
    throw new HttpException(
      `The following items are unavailable: ${unavailableItems.join(", ")}`,
      400,
    );
  }
  // Step 4: Create order within transaction
  const order = await MyGlobal.prisma.$transaction(async (tx) => {
    // Create order using collector
    const orderData = await EcommerceMallOrderCollector.collect({
      body: props.body,
      customer: { id: props.customer.id } satisfies IEntity,
    });
    // Update total price and status
    const orderInput: Prisma.ecommerce_mall_ordersCreateInput = {
      ...orderData,
      total_price: totalPrice,
      status: "paid",
    };
    const createdOrder = await tx.ecommerce_mall_orders.create({
      data: orderInput,
    });
    // Create order items with snapshots
    for (const item of processedItems) {
      const orderItemId: string = v4();
      // Create order item - use correct relation property name "variant"
      await tx.ecommerce_mall_order_items.create({
        data: {
          id: orderItemId,
          order: { connect: { id: createdOrder.id } },
          product: { connect: { id: item.productId } },
          variant: { connect: { id: item.variantId } },
          seller: { connect: { id: item.sellerId } },
          quantity: item.quantity,
          price_at_purchase: item.priceAtPurchase,
          status: "paid",
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: null,
        },
      });
      // Create product snapshot - use base_price not price
      await tx.ecommerce_mall_order_item_product_snapshots.create({
        data: {
          id: v4(),
          orderItem: { connect: { id: orderItemId } },
          name: item.productName,
          description: item.productDescription,
          category: { connect: { id: item.categoryId } },
          base_price: item.productBasePrice,
          created_at: new Date(),
        },
      });
      // Create variant snapshot and capture its ID for attributes
      const variantSnapshotId: string = v4();
      await tx.ecommerce_mall_order_item_variant_snapshots.create({
        data: {
          id: variantSnapshotId,
          orderItem: { connect: { id: orderItemId } },
          sku_code: item.skuCode,
          price: item.priceAtPurchase,
          created_at: new Date(),
        },
      });
      // Create variant option snapshot attributes
      for (const opt of item.variantOptions) {
        await tx.ecommerce_mall_order_item_variant_snapshot_attributes.create({
          data: {
            id: v4(),
            variantSnapshot: { connect: { id: variantSnapshotId } },
            option_key: opt.optionName,
            option_value: opt.optionValue,
            created_at: new Date(),
          },
        });
      }
      // Create seller snapshot
      await tx.ecommerce_mall_order_item_seller_snapshots.create({
        data: {
          id: v4(),
          orderItem: { connect: { id: orderItemId } },
          shop_name: item.sellerShopName,
          created_at: new Date(),
        },
      });
      // Create inventory record (deduct stock) - use "variant" not "productVariant"
      await tx.ecommerce_mall_inventory_records.create({
        data: {
          id: v4(),
          variant: { connect: { id: item.variantId } },
          quantity_change: -item.quantity,
          reason: "order_placed",
          created_at: new Date(),
        },
      });
    }
    // Delete cart items
    await tx.ecommerce_mall_cart_items.deleteMany({
      where: {
        customer_id: props.customer.id,
        deleted_at: null,
      },
    });
    return createdOrder;
  });
  // Step 5: Query complete order with relations and transform
  const completeOrder =
    await MyGlobal.prisma.ecommerce_mall_orders.findUniqueOrThrow({
      where: { id: order.id },
      ...EcommerceMallOrderTransformer.select(),
    });
  return EcommerceMallOrderTransformer.transform(completeOrder);
}
