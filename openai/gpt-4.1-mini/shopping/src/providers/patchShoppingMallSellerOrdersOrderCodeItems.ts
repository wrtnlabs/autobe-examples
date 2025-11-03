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

export async function patchShoppingMallSellerOrdersOrderCodeItems(props: {
  seller: SellerPayload;
  orderCode: string;
  body: IShoppingMallOrderItem.IRequest;
}): Promise<IPageIShoppingMallOrderItem.ISummary> {
  const { seller, orderCode, body } = props;
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { order_code: orderCode },
    select: { id: true },
  });

  if (!order) {
    throw new HttpException(`Order with code ${orderCode} not found`, 404);
  }

  const where: any = {
    shopping_mall_order_id: order.id,
  };

  if (body.search !== undefined && body.search !== null) {
    where.OR = [
      { sku_code: { contains: body.search } },
      { attributes_json: { contains: body.search } },
    ];
  }

  const validSortFields = [
    "quantity",
    "unit_price",
    "total_price",
    "created_at",
    "updated_at",
  ];

  const orderBy: Record<string, "asc" | "desc"> =
    body.sort_by && validSortFields.includes(body.sort_by)
      ? { [body.sort_by]: body.order === "asc" ? "asc" : "desc" }
      : { created_at: "desc" };

  const [total, results] = await Promise.all([
    MyGlobal.prisma.shopping_mall_order_items.count({
      where: where,
    }),
    MyGlobal.prisma.shopping_mall_order_items.findMany({
      where: where,
      take: limit,
      skip: skip,
      orderBy: orderBy,
    }),
  ]);

  const productSkuIds = results.map(
    (item) => item.shopping_mall_product_sku_id,
  );

  const productSkusArray =
    await MyGlobal.prisma.shopping_mall_product_skus.findMany({
      where: { id: { in: productSkuIds } },
      select: {
        id: true,
        sku_code: true,
        price: true,
        attributes_json: true,
      },
    });

  const productSkusMap = new Map(productSkusArray.map((sku) => [sku.id, sku]));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((item) => {
      const sku = productSkusMap.get(item.shopping_mall_product_sku_id);
      if (!sku) {
        throw new HttpException(
          `Product SKU not found for id ${item.shopping_mall_product_sku_id}`,
          404,
        );
      }
      return {
        id: item.id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        product_sku: {
          id: sku.id satisfies string & tags.Format<"uuid"> as string &
            tags.Format<"uuid">,
          sku_code: sku.sku_code,
          price: sku.price,
          attributes_json: sku.attributes_json ?? null,
        },
      };
    }),
  };
}
