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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingMallCustomerOrdersOrderCodeItems(props: {
  customer: CustomerPayload;
  orderCode: string;
  body: IShoppingMallOrderItem.IRequest;
}): Promise<IPageIShoppingMallOrderItem.ISummary> {
  const { customer, orderCode, body } = props;

  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { order_code: orderCode },
  });

  if (order === null) {
    throw new HttpException("Order not found", 404);
  }

  if (order.shopping_mall_customer_id !== customer.id) {
    throw new HttpException("Unauthorized", 403);
  }

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<1>;
  const limit = (body.limit ?? 20) as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100>;
  const skip = (page - 1) * limit;

  const sortBy = body.sort_by ?? "created_at";
  const orderByDirection = body.order === "asc" ? "asc" : "desc";

  const whereCondition = {
    shopping_mall_order_id: order.id,
    deleted_at: null,
    ...(body.search !== undefined &&
      body.search !== null && {
        productSku: {
          OR: [
            { sku_code: { contains: body.search } },
            { attributes_json: { contains: body.search } },
          ],
        },
      }),
  };

  const [items, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_order_items.findMany({
      where: whereCondition,
      include: {
        productSku: {
          select: {
            id: true,
            sku_code: true,
            price: true,
            attributes_json: true,
          },
        },
      },
      orderBy: { [sortBy]: orderByDirection },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_order_items.count({ where: whereCondition }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: items.map((item) => ({
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
    })),
  };
}
