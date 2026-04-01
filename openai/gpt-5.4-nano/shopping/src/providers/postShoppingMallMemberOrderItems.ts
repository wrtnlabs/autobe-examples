import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { IShoppingMallSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ShoppingMallOrderItemTransformer } from "../transformers/ShoppingMallOrderItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallMemberItems(props: {
  member: MemberPayload;
  body: IShoppingMallOrderItem.ICreate;
}): Promise<IShoppingMallOrderItem> {
  const { member, body } = props;
  if (
    body.shopping_mall_order_id == null ||
    body.shopping_mall_order_id === ""
  ) {
    throw new HttpException("Invalid order id", 400);
  }
  if (
    body.shopping_mall_product_variant_id == null ||
    body.shopping_mall_product_variant_id === ""
  ) {
    throw new HttpException("Invalid product variant id", 400);
  }
  if (body.seller_snapshot_id == null || body.seller_snapshot_id === "") {
    throw new HttpException("Invalid seller snapshot id", 400);
  }
  if (body.quantity <= 0) {
    throw new HttpException("Quantity must be positive", 400);
  }
  if (!body.line_item_status) {
    throw new HttpException("Invalid line item status", 400);
  }
  if (!body.placed_at) {
    throw new HttpException("Invalid placed_at", 400);
  }
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: body.shopping_mall_order_id },
    select: {
      id: true,
      shopping_customer_id: true,
      deleted_at: true,
      placed_at: true,
    },
  });
  if (order == null || order.deleted_at != null) {
    throw new HttpException("Order not found", 404);
  }
  if (order.shopping_customer_id !== member.id) {
    throw new HttpException("Forbidden", 403);
  }
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findUnique({
      where: { id: body.shopping_mall_product_variant_id },
      select: { id: true, is_active: true, deleted_at: true },
    });
  if (
    variant == null ||
    variant.deleted_at != null ||
    variant.is_active !== true
  ) {
    throw new HttpException("Product variant not available", 404);
  }
  if (body.shopping_mall_shipment_id != null) {
    const shipmentOk = await MyGlobal.prisma.shopping_mall_shipments.findFirst({
      where: {
        id: body.shopping_mall_shipment_id,
        deleted_at: null,
        shopping_mall_order_id: body.shopping_mall_order_id,
      },
      select: { id: true },
    });
    if (shipmentOk == null) {
      throw new HttpException("Shipment not found", 404);
    }
  }
  try {
    const created = await MyGlobal.prisma.$transaction(async (tx) => {
      const now = new Date();
      const inserted = await tx.shopping_mall_order_items.create({
        data: {
          id: v4(),
          shopping_mall_order_id: body.shopping_mall_order_id,
          shopping_mall_product_variant_id:
            body.shopping_mall_product_variant_id,
          seller_snapshot_id: body.seller_snapshot_id,
          shopping_mall_shipment_id:
            body.shopping_mall_shipment_id ?? undefined,
          seller_price_at_purchase: body.seller_price_at_purchase,
          quantity: body.quantity,
          line_item_status: body.line_item_status,
          placed_at: toISOStringSafe(body.placed_at),
          deleted_at: null,
          created_at: now,
          updated_at: now,
        },
        select: { id: true },
      });
      const full = await tx.shopping_mall_order_items.findUniqueOrThrow({
        where: { id: inserted.id },
        ...ShoppingMallOrderItemTransformer.select(),
      });
      return full;
    });
    return await ShoppingMallOrderItemTransformer.transform(created);
  } catch (e) {
    if (e instanceof HttpException) {
      throw e;
    }
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2003") {
        throw new HttpException("Referenced record not found", 404);
      }
      if (e.code === "P2002") {
        throw new HttpException("Conflict", 409);
      }
    }
    throw new HttpException("Internal server error", 500);
  }
}
