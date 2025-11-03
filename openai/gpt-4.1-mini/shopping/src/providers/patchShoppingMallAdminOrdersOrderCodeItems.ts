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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminOrdersOrderCodeItems(props: {
  admin: AdminPayload;
  orderCode: string;
  body: IShoppingMallOrderItem.IRequest;
}): Promise<IPageIShoppingMallOrderItem.ISummary> {
  const { admin, orderCode, body } = props;

  const order = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: {
      order_code: orderCode,
      deleted_at: null,
    },
    select: { id: true },
  });

  if (!order) {
    throw new HttpException("Order not found", 404);
  }

  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const orderDirection = body.order === "asc" ? "asc" : "desc";

  const allowedSortFields = [
    "quantity",
    "unit_price",
    "total_price",
    "created_at",
    "updated_at",
    "sku_code",
  ];

  const sortBy = allowedSortFields.includes(body.sort_by ?? "created_at")
    ? (body.sort_by ?? "created_at")
    : "created_at";

  const whereCondition = {
    deleted_at: null,
    shopping_mall_order_id: order.id,
    ...(body.search !== undefined && body.search !== null
      ? {
          productSku: {
            sku_code: {
              contains: body.search,
            },
          },
        }
      : {}),
  };

  const [orderItems, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_order_items.findMany({
      where: whereCondition,
      include: {
        productSku: true,
      },
      orderBy:
        sortBy === "sku_code"
          ? { productSku: { sku_code: orderDirection } }
          : { [sortBy]: orderDirection },
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_order_items.count({
      where: whereCondition,
    }),
  ]);

  const data: IShoppingMallOrderItem.ISummary[] = orderItems.map((item) => ({
    id: item.id,
    quantity: item.quantity,
    unit_price: item.unit_price,
    total_price: item.total_price,
    product_sku: {
      id: item.productSku.id,
      sku_code: item.productSku.sku_code,
      price: item.productSku.price,
      attributes_json: item.productSku.attributes_json ?? null,
    },
  }));

  const pagination: IPage.IPagination = {
    current: page,
    limit: limit,
    records: total,
    pages: Math.ceil(total / limit),
  };

  return {
    pagination,
    data,
  };
}
