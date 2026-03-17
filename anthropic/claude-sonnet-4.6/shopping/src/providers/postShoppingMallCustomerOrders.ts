import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { IShoppingMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotImage";
import { IShoppingMallProductSnapshotSkus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotSkus";
import { IShoppingMallProductSnapshotSkusOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotSkusOption";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { IShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestSnapshot";
import { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { IShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSnapshot";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfileSnapshot";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallOrderCollector } from "../collectors/ShoppingMallOrderCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallOrderTransformer } from "../transformers/ShoppingMallOrderTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallCustomerOrders(props: {
  customer: CustomerPayload;
  body: IShoppingMallOrder.ICreate;
}): Promise<IShoppingMallOrder> {
  // Check if customer is banned
  const customerRecord =
    await MyGlobal.prisma.shopping_mall_customers.findUniqueOrThrow({
      where: { id: props.customer.id },
      select: { id: true, is_banned: true },
    });
  if (customerRecord.is_banned) {
    throw new HttpException(
      "Your account has been banned and cannot place orders",
      403,
    );
  }
  // --- Pre-transaction: validate variants, check inventory, resolve snapshots ---
  type ItemResolution = {
    variantId: string;
    quantity: number;
    unitPrice: number;
    productSnapshotId: string;
    productSnapshotSkusId: string;
    sellerProfileSnapshotId: string;
  };
  const resolvedItems: ItemResolution[] = [];
  for (const item of props.body.items) {
    // Validate variant exists and is not soft-deleted
    const variant =
      await MyGlobal.prisma.shopping_mall_product_variants.findFirstOrThrow({
        where: {
          id: item.product_variant_id,
          deleted_at: null,
        },
        select: {
          id: true,
          shopping_mall_product_id: true,
          price_override: true,
        },
      });
    // Check available inventory (sum of all inventory record quantities)
    const inventoryAgg =
      await MyGlobal.prisma.shopping_mall_inventory_records.aggregate({
        where: { shopping_mall_product_variant_id: item.product_variant_id },
        _sum: { quantity: true },
      });
    const currentStock = inventoryAgg._sum.quantity ?? 0;
    if (currentStock < item.quantity) {
      throw new HttpException(
        `Insufficient stock for variant ${item.product_variant_id}: available ${currentStock}, requested ${item.quantity}`,
        400,
      );
    }
    // Get the product to resolve the seller_id
    const product =
      await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
        where: { id: variant.shopping_mall_product_id },
        select: {
          id: true,
          shopping_mall_seller_id: true,
          deleted_at: true,
        },
      });
    if (product.deleted_at !== null) {
      throw new HttpException(
        `Product for variant ${item.product_variant_id} is no longer available`,
        400,
      );
    }
    // Get the latest product snapshot
    const productSnapshot =
      await MyGlobal.prisma.shopping_mall_product_snapshots.findFirstOrThrow({
        where: { product_id: variant.shopping_mall_product_id },
        orderBy: { created_at: "desc" },
        select: { id: true },
      });
    // Get the matching SKU snapshot for this variant from the latest snapshot
    const skuSnapshot =
      await MyGlobal.prisma.shopping_mall_product_snapshot_skuses.findFirstOrThrow(
        {
          where: {
            product_snapshot_id: productSnapshot.id,
            product_variant_id: item.product_variant_id,
          },
          select: {
            id: true,
            price: true,
          },
        },
      );
    // Get the latest seller profile snapshot
    const sellerProfileSnapshot =
      await MyGlobal.prisma.shopping_mall_seller_profile_snapshots.findFirstOrThrow(
        {
          where: { seller_id: product.shopping_mall_seller_id },
          orderBy: { created_at: "desc" },
          select: { id: true },
        },
      );
    resolvedItems.push({
      variantId: item.product_variant_id,
      quantity: item.quantity,
      unitPrice: skuSnapshot.price,
      productSnapshotId: productSnapshot.id,
      productSnapshotSkusId: skuSnapshot.id,
      sellerProfileSnapshotId: sellerProfileSnapshot.id,
    });
  }
  // Compute total_price as sum of (unit_price × quantity) for all items
  const totalPrice = resolvedItems.reduce(
    (acc, r) => acc + r.unitPrice * r.quantity,
    0,
  );
  // Build collector data for the order (using ShoppingMallOrderCollector)
  const orderCollectorData = await ShoppingMallOrderCollector.collect({
    body: props.body,
    shoppingMallCustomers: { id: props.customer.id },
    shoppingMallCustomerSessions: { id: props.customer.session_id },
  });
  const orderId = v4();
  const now = new Date();
  // --- Atomic transaction: create order, order items, item snapshots, inventory deductions ---
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Create the order (override id, total_price, and timestamps from collector)
    await tx.shopping_mall_orders.create({
      data: {
        ...orderCollectorData,
        id: orderId,
        total_price: totalPrice,
        created_at: now,
        updated_at: now,
      },
    });
    for (const resolved of resolvedItems) {
      const orderItemId = v4();
      // Create the order item
      await tx.shopping_mall_order_items.create({
        data: {
          id: orderItemId,
          shopping_mall_order_id: orderId,
          shopping_mall_product_variant_id: resolved.variantId,
          quantity: resolved.quantity,
          unit_price: resolved.unitPrice,
          status: "paid",
          created_at: now,
          updated_at: now,
        },
      });
      // Create the immutable order item snapshot
      await tx.shopping_mall_order_item_snapshots.create({
        data: {
          id: v4(),
          order_item_id: orderItemId,
          product_snapshot_id: resolved.productSnapshotId,
          product_snapshot_skus_id: resolved.productSnapshotSkusId,
          seller_profile_snapshot_id: resolved.sellerProfileSnapshotId,
          created_at: now,
        },
      });
      // Deduct inventory (negative quantity, reason_type = 'order_placement')
      await tx.shopping_mall_inventory_records.create({
        data: {
          id: v4(),
          shopping_mall_product_variant_id: resolved.variantId,
          quantity: -resolved.quantity,
          reason_type: "order_placement",
          note: null,
          created_at: now,
        },
      });
    }
  });
  // --- Fetch and return the full order DTO via transformer ---
  const createdOrder =
    await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
      where: { id: orderId },
      ...ShoppingMallOrderTransformer.select(),
    });
  return ShoppingMallOrderTransformer.transform(createdOrder);
}
