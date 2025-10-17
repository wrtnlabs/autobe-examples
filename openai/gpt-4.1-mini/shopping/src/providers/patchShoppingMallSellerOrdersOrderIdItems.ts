import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function patchShoppingMallSellerOrdersOrderIdItems(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderItem.IRequest;
}): Promise<IPageIShoppingMallOrderItem> {
  const { seller, orderId, body } = props;

  const order = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: {
      id: orderId,
      shopping_mall_seller_id: seller.id,
      deleted_at: null,
      status: "active",
    },
    select: { id: true },
  });

  if (!order) {
    throw new HttpException("Order not found or unauthorized.", 404);
  }

  // Pagination defaults
  const page = 1 as number & tags.Type<"int32"> & tags.Minimum<0>;
  const limit = 10 as number & tags.Type<"int32"> & tags.Minimum<0>;
  const skip = (page - 1) * limit;

  const where = {
    shopping_mall_order_id: orderId,
    ...(body.shopping_mall_sku_id !== undefined &&
      body.shopping_mall_sku_id !== null && {
        shopping_mall_sku_id: body.shopping_mall_sku_id,
      }),
    ...(body.quantity !== undefined &&
      body.quantity !== null && {
        quantity: body.quantity,
      }),
    ...(body.unit_price !== undefined &&
      body.unit_price !== null && {
        unit_price: body.unit_price,
      }),
    ...(body.total_price !== undefined &&
      body.total_price !== null && {
        total_price: body.total_price,
      }),
    ...((body.created_at_from !== undefined && body.created_at_from !== null) ||
    (body.created_at_to !== undefined && body.created_at_to !== null)
      ? {
          created_at: {
            ...(body.created_at_from !== undefined &&
              body.created_at_from !== null && {
                gte: body.created_at_from,
              }),
            ...(body.created_at_to !== undefined &&
              body.created_at_to !== null && {
                lte: body.created_at_to,
              }),
          },
        }
      : {}),
    ...((body.updated_at_from !== undefined && body.updated_at_from !== null) ||
    (body.updated_at_to !== undefined && body.updated_at_to !== null)
      ? {
          updated_at: {
            ...(body.updated_at_from !== undefined &&
              body.updated_at_from !== null && {
                gte: body.updated_at_from,
              }),
            ...(body.updated_at_to !== undefined &&
              body.updated_at_to !== null && {
                lte: body.updated_at_to,
              }),
          },
        }
      : {}),
  };

  const orderItems = await MyGlobal.prisma.shopping_mall_order_items.findMany({
    where,
    orderBy: { created_at: "desc" },
    skip,
    take: limit,
  });

  await Promise.all(
    orderItems.map(async (item) => {
      const updateData: Partial<{
        shopping_mall_sku_id: string & tags.Format<"uuid">;
        quantity: number & tags.Type<"int32">;
        unit_price: number;
        total_price: number;
        updated_at: string & tags.Format<"date-time">;
      }> = {};

      if (
        body.shopping_mall_sku_id !== undefined &&
        body.shopping_mall_sku_id !== null
      ) {
        updateData.shopping_mall_sku_id = body.shopping_mall_sku_id;
      }
      if (body.quantity !== undefined && body.quantity !== null) {
        updateData.quantity = body.quantity;
      }
      if (body.unit_price !== undefined && body.unit_price !== null) {
        updateData.unit_price = body.unit_price;
      }
      if (body.total_price !== undefined && body.total_price !== null) {
        updateData.total_price = body.total_price;
      }

      if (Object.keys(updateData).length > 0) {
        updateData.updated_at = toISOStringSafe(new Date());
        await MyGlobal.prisma.shopping_mall_order_items.update({
          where: { id: item.id },
          data: updateData,
        });
      }
    }),
  );

  const total = await MyGlobal.prisma.shopping_mall_order_items.count({
    where,
  });

  const updatedItems = await MyGlobal.prisma.shopping_mall_order_items.findMany(
    {
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    },
  );

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: updatedItems.map((item) => ({
      id: item.id,
      shopping_mall_order_id: item.shopping_mall_order_id,
      shopping_mall_sku_id: item.shopping_mall_sku_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price,
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
    })),
  };
}
