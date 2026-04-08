import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import { IShoppingMallOrderItemSnapshotOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotOption";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ShoppingMallOrderTransformer } from "../transformers/ShoppingMallOrderTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallMemberOrders(props: {
  member: MemberPayload;
  body: IShoppingMallOrder.ICreate;
}): Promise<IShoppingMallOrder> {
  // Validate shipping address exists and belongs to customer
  const address =
    await MyGlobal.prisma.shopping_mall_customer_addresses.findFirst({
      where: {
        id: props.body.shopping_mall_customer_address_id,
        customerProfile: {
          shopping_mall_member_id: props.member.id,
          deleted_at: null,
        },
        deleted_at: null,
      },
    });
  if (!address) {
    throw new HttpException("Invalid shipping address", 400);
  }
  // Retrieve customer's cart with items
  const cart = await MyGlobal.prisma.shopping_mall_carts.findFirst({
    where: {
      member_id: props.member.id,
      deleted_at: null,
    },
    include: {
      items: {
        where: {},
        include: {
          productVariant: {
            include: {
              product: {
                include: {
                  seller: true,
                },
              },
              inventoryRecords: true,
            },
          },
        },
      },
    },
  });
  if (!cart || cart.items.length === 0) {
    throw new HttpException("Cart is empty", 400);
  }
  // Validate all variants and calculate total
  let totalPrice = 0;
  for (const cartItem of cart.items) {
    const variant = cartItem.productVariant;
    // Check variant not deleted
    if (variant.deleted_at !== null) {
      throw new HttpException("Product variant is no longer available", 400);
    }
    // Calculate current stock from inventory records
    const currentStock = variant.inventoryRecords.reduce(
      (
        sum: number,
        record: Prisma.shopping_mall_inventory_recordsGetPayload<{}>,
      ) => sum + record.quantity_delta,
      0,
    );
    // Check sufficient stock
    if (currentStock < cartItem.quantity) {
      throw new HttpException(
        `Insufficient stock for ${variant.product.name} - ${variant.option_values}`,
        400,
      );
    }
    // Calculate item price (variant price override or product base price)
    const itemPrice = variant.price ?? variant.product.base_price;
    totalPrice += itemPrice * cartItem.quantity;
  }
  // Generate unique order code
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
  const orderCode = `ORD-${datePart}-${randomPart}`;
  const now = new Date();
  // Execute transaction: create order, order items, inventory records, clear cart
  const order = await MyGlobal.prisma.$transaction(async (tx) => {
    // Create order record
    const createdOrder = await tx.shopping_mall_orders.create({
      data: {
        id: v4(),
        code: orderCode,
        total_price: totalPrice,
        member: { connect: { id: props.member.id } },
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
    // Create order items and inventory records for each cart item
    for (const cartItem of cart.items) {
      const variant = cartItem.productVariant;
      const itemPrice = variant.price ?? variant.product.base_price;
      // Create order item
      const orderItem = await tx.shopping_mall_order_items.create({
        data: {
          id: v4(),
          shopping_mall_order_id: createdOrder.id,
          shopping_mall_product_id: variant.shopping_mall_product_id,
          shopping_mall_product_variant_id: variant.id,
          shopping_mall_seller_id: variant.product.shopping_mall_seller_id,
          quantity: cartItem.quantity,
          price: itemPrice,
          status: "paid",
          created_at: now,
          updated_at: now,
        },
      });
      // Create order item snapshot
      await tx.shopping_mall_order_item_snapshots.create({
        data: {
          id: v4(),
          shopping_mall_order_item_id: orderItem.id,
          product_name: variant.product.name,
          product_description: variant.product.description ?? "",
          variant_price: itemPrice,
          seller_shop_name: "",
          seller_logo_url: null,
          created_at: now,
        },
      });
      // Create inventory record to deduct stock
      await tx.shopping_mall_inventory_records.create({
        data: {
          id: v4(),
          shopping_mall_product_variant_id: variant.id,
          quantity_delta: -cartItem.quantity,
          reason: "ORDER_PLACEMENT",
          created_at: now,
        },
      });
    }
    // Clear cart items by deleting them
    await tx.shopping_mall_cart_items.deleteMany({
      where: {
        shopping_mall_cart_id: cart.id,
      },
    });
    // Return created order with full relations
    return tx.shopping_mall_orders.findUniqueOrThrow({
      where: { id: createdOrder.id },
      ...ShoppingMallOrderTransformer.select(),
    });
  });
  return await ShoppingMallOrderTransformer.transform(order);
}
