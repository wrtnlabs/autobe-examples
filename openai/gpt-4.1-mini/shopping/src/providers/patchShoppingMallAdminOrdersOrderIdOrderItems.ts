import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminOrdersOrderIdOrderItems(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderItem.IRequest;
}): Promise<IPageIShoppingMallOrderItem.ISummary> {
  const page = (props.body.page ?? 1) satisfies number as number;
  const limit = (props.body.limit ?? 10) satisfies number as number;
  const skip = (page - 1) * limit;

  const whereClause = {
    shopping_mall_order_id: props.orderId,
    AND: [
      {
        OR: [
          { quantity: { gte: Number.MIN_SAFE_INTEGER } },
          { unit_price: { gte: Number.MIN_SAFE_INTEGER } },
          { total_price: { gte: Number.MIN_SAFE_INTEGER } },
        ],
      },
    ],
  } as {
    shopping_mall_order_id: string & tags.Format<"uuid">;
    AND: {
      OR: (
        | { quantity: { gte: number } }
        | { unit_price: { gte: number } }
        | { total_price: { gte: number } }
      )[];
    }[];
  };

  if (props.body.search) {
    whereClause.AND.push({
      shopping_mall_product_variant_id: {
        contains: props.body.search,
      },
    } as any);
  }

  const orderByClause = props.body.sort_by
    ? {
        [props.body.sort_by]: (props.body.order || "asc") satisfies
          | "asc"
          | "desc" as "asc" | "desc",
      }
    : { id: "asc" as "asc" };

  const [orderItems, totalCount] = await Promise.all([
    MyGlobal.prisma.shopping_mall_order_items.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: orderByClause as any,
    }),
    MyGlobal.prisma.shopping_mall_order_items.count({
      where: { shopping_mall_order_id: props.orderId },
    }),
  ]);

  const productVariantIds = [
    ...new Set(orderItems.map((o) => o.shopping_mall_product_variant_id)),
  ];
  const productVariants =
    await MyGlobal.prisma.shopping_mall_product_variants.findMany({
      where: { id: { in: productVariantIds } },
    });

  const productVariantsMap = new Map(productVariants.map((pv) => [pv.id, pv]));

  // Filter out orderItems missing matching variant to preserve non-null contract
  const filteredItems = orderItems.filter((item) =>
    productVariantsMap.has(item.shopping_mall_product_variant_id),
  );

  return {
    pagination: {
      current: page,
      limit: limit,
      records: totalCount,
      pages: Math.ceil(totalCount / limit),
    },
    data: filteredItems.map((item) => {
      const variant = productVariantsMap.get(
        item.shopping_mall_product_variant_id,
      )!;
      return {
        id: item.id as string & tags.Format<"uuid">,
        quantity: item.quantity satisfies number as number,
        unit_price: item.unit_price satisfies number as number,
        total_price: item.total_price satisfies number as number,
        shopping_mall_product_variant: {
          id: variant.id as string & tags.Format<"uuid">,
          sku_code: variant.sku_code,
          price: variant.price satisfies number as number,
        },
      };
    }),
  };
}
