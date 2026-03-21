import { IEcommerceMallCheckoutConfirm } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckoutConfirm";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallCustomerAtSummaryTransformer } from "../transformers/EcommerceMallCustomerAtSummaryTransformer";
import { EcommerceMallOrderItemTransformer } from "../transformers/EcommerceMallOrderItemTransformer";
import { EcommerceMallOrderTransformer } from "../transformers/EcommerceMallOrderTransformer";
import { EcommerceMallShipmentTransformer } from "../transformers/EcommerceMallShipmentTransformer";
import { EcommerceMallShippingAddressTransformer } from "../transformers/EcommerceMallShippingAddressTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallCustomerCheckoutConfirm(props: {
  customer: CustomerPayload;
  body: IEcommerceMallCheckoutConfirm.IRequest;
}): Promise<IEcommerceMallOrder> {
  // 1. Fetch customer's cart with items and validate
  const cart = await MyGlobal.prisma.ecommerce_mall_carts.findUnique({
    where: { ecommerce_mall_customer_id: props.customer.id },
    include: {
      cartItems: {
        include: {
          productVariant: {
            include: {
              product: {
                include: {
                  seller: {
                    include: {
                      profile: true,
                    },
                  },
                  category: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!cart || cart.cartItems.length === 0) {
    throw new HttpException("Cart is empty or does not exist", 400);
  }
  // 2. Validate shipping address
  let shippingAddressId: string;
  if (props.body.address_id) {
    const address =
      await MyGlobal.prisma.ecommerce_mall_shipping_addresses.findFirst({
        where: {
          id: props.body.address_id,
          ecommerce_mall_customer_id: props.customer.id,
          deleted_at: null,
        },
      });
    if (!address) {
      throw new HttpException("Shipping address not found or invalid", 400);
    }
    shippingAddressId = address.id;
  } else {
    const defaultAddress =
      await MyGlobal.prisma.ecommerce_mall_shipping_addresses.findFirst({
        where: {
          ecommerce_mall_customer_id: props.customer.id,
          is_default: true,
          deleted_at: null,
        },
      });
    if (!defaultAddress) {
      throw new HttpException("No default shipping address found", 400);
    }
    shippingAddressId = defaultAddress.id;
  }
  // 3. Validate all cart items for availability and stock
  for (const item of cart.cartItems) {
    const variant = item.productVariant;
    if (variant.deleted_at !== null) {
      throw new HttpException(
        `Product variant ${variant.sku_code} is no longer available`,
        400,
      );
    }
    if (variant.product.deleted_at !== null) {
      throw new HttpException(
        `Product "${variant.product.name}" is no longer available`,
        400,
      );
    }
    if (variant.quantity < item.quantity) {
      throw new HttpException(
        `Insufficient stock for variant ${variant.sku_code}. Available: ${variant.quantity}, Requested: ${item.quantity}`,
        400,
      );
    }
  }
  // 4. Execute atomic transaction
  const now = new Date();
  return await MyGlobal.prisma.$transaction(async (tx) => {
    // 4a. Generate unique order number with retry on collision
    let orderNumber = "";
    let orderNumberExists = true;
    let retryCount = 0;
    while (orderNumberExists && retryCount < 10) {
      const timestamp = Date.now().toString(36).toUpperCase();
      const randomPart = Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase();
      orderNumber = `ORD-${timestamp}-${randomPart}`;
      const existing = await tx.ecommerce_mall_orders.findUnique({
        where: { order_number: orderNumber },
      });
      orderNumberExists = existing !== null;
      retryCount++;
    }
    if (orderNumberExists) {
      throw new HttpException("Failed to generate unique order number", 500);
    }
    // 4b. Calculate totals
    let subtotal = 0;
    const cartItemsData = cart.cartItems.map((item) => {
      const unitPrice =
        item.productVariant.price ?? item.productVariant.product.base_price;
      subtotal += unitPrice * item.quantity;
      return { item, unitPrice };
    });
    // Shipping cost: flat rate per seller (for now, simple calculation)
    const sellerIds = [
      ...new Set(
        cart.cartItems.map(
          (item) => item.productVariant.product.ecommerce_mall_seller_id,
        ),
      ),
    ];
    const shippingCost = sellerIds.length * 5.0; // $5 per seller as example
    const totalAmount = subtotal + shippingCost;
    // 4c. Create order
    const orderId = v4() as string & tags.Format<"uuid">;
    const order = await tx.ecommerce_mall_orders.create({
      data: {
        id: orderId,
        ecommerce_mall_customer_id: props.customer.id,
        ecommerce_mall_shipping_address_id: shippingAddressId,
        order_number: orderNumber,
        subtotal: subtotal,
        shipping_cost: shippingCost,
        total_amount: totalAmount,
        status: "paid",
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
    // 4d. Process each cart item
    const orderItemsData: Array<{
      orderItemId: string & tags.Format<"uuid">;
      sellerId: string;
      productSnapshotId: string & tags.Format<"uuid">;
      sellerProfileSnapshotId: string & tags.Format<"uuid">;
    }> = [];
    for (const { item, unitPrice } of cartItemsData) {
      const variant = item.productVariant;
      const product = variant.product;
      const seller = product.seller;
      const sellerProfile = seller.profile;
      if (!sellerProfile) {
        throw new HttpException(
          `Seller ${seller.id} is missing a profile`,
          500,
        );
      }
      const category = product.category;
      // Create product snapshot
      const productSnapshotId = v4() as string & tags.Format<"uuid">;
      await tx.ecommerce_mall_product_snapshots.create({
        data: {
          id: productSnapshotId,
          ecommerce_mall_product_id: product.id,
          ecommerce_mall_seller_id: seller.id,
          name: product.name,
          description: product.description,
          base_price: product.base_price,
          category_name: category.name,
          created_at: now,
        },
      });
      // Create seller profile snapshot
      const sellerProfileSnapshotId = v4() as string & tags.Format<"uuid">;
      await tx.ecommerce_mall_seller_profile_snapshots.create({
        data: {
          id: sellerProfileSnapshotId,
          ecommerce_mall_seller_profile_id: sellerProfile.id,
          shop_name: sellerProfile.name,
          shop_description: sellerProfile.description,
          logo_url: sellerProfile.logo_uri,
          created_at: now,
        },
      });
      // Create order item
      const orderItemId = v4() as string & tags.Format<"uuid">;
      await tx.ecommerce_mall_order_items.create({
        data: {
          id: orderItemId,
          ecommerce_mall_order_id: orderId,
          ecommerce_mall_product_id: product.id,
          ecommerce_mall_product_variant_id: variant.id,
          ecommerce_mall_product_snapshot_id: productSnapshotId,
          ecommerce_mall_seller_profile_snapshot_id: sellerProfileSnapshotId,
          quantity: item.quantity,
          unit_price: unitPrice,
          status: "paid",
          created_at: now,
          updated_at: now,
        },
      });
      orderItemsData.push({
        orderItemId,
        sellerId: seller.id,
        productSnapshotId,
        sellerProfileSnapshotId,
      });
      // Decrement variant quantity
      await tx.ecommerce_mall_product_variants.update({
        where: { id: variant.id },
        data: {
          quantity: variant.quantity - item.quantity,
          updated_at: now,
        },
      });
      // Create inventory record
      const inventoryRecordId = v4() as string & tags.Format<"uuid">;
      await tx.ecommerce_mall_inventory_records.create({
        data: {
          id: inventoryRecordId,
          ecommerce_mall_product_variant_id: variant.id,
          quantity_change: -item.quantity,
          reason: "order_placement",
          created_at: now,
        },
      });
    }
    // 4e. Create shipments grouped by seller
    const shipmentsBySeller = new Map<string, string[]>();
    for (const { orderItemId, sellerId } of orderItemsData) {
      const existing = shipmentsBySeller.get(sellerId) ?? [];
      existing.push(orderItemId);
      shipmentsBySeller.set(sellerId, existing);
    }
    for (const [sellerId, itemIds] of shipmentsBySeller) {
      const shipmentId = v4() as string & tags.Format<"uuid">;
      await tx.ecommerce_mall_shipments.create({
        data: {
          id: shipmentId,
          ecommerce_mall_order_id: orderId,
          ecommerce_mall_seller_id: sellerId,
          carrier: "",
          tracking_number: "",
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
      });
      // Create shipment items
      for (const itemId of itemIds) {
        const shipmentItemId = v4() as string & tags.Format<"uuid">;
        await tx.ecommerce_mall_shipment_items.create({
          data: {
            id: shipmentItemId,
            ecommerce_mall_shipment_id: shipmentId,
            ecommerce_mall_order_item_id: itemId,
            created_at: now,
          },
        });
      }
    }
    // 4f. Delete cart items
    await tx.ecommerce_mall_cart_items.deleteMany({
      where: { ecommerce_mall_cart_id: cart.id },
    });
    // 5. Fetch and return the complete order
    const completeOrder = await tx.ecommerce_mall_orders.findUniqueOrThrow({
      where: { id: orderId },
      include: {
        customer: EcommerceMallCustomerAtSummaryTransformer.select(),
        shippingAddress: EcommerceMallShippingAddressTransformer.select(),
        orderItems: EcommerceMallOrderItemTransformer.select(),
        shipments: EcommerceMallShipmentTransformer.select(),
      },
    });
    return await EcommerceMallOrderTransformer.transform(completeOrder);
  });
}
