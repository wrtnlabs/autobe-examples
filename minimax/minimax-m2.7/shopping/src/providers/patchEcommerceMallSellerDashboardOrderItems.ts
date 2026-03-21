import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItem";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallOrderItemAtSummaryTransformer } from "../transformers/EcommerceMallOrderItemAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerDashboardOrderItems(props: {
  seller: SellerPayload;
  body: IEcommerceMallOrderItem.IRequest;
}): Promise<IPageIEcommerceMallOrderItem.ISummary> {
  const limit = (props.body.limit ?? 20) satisfies number as number &
    tags.Type<"int32"> &
    tags.Minimum<0>;
  const page = (props.body.page ?? 1) satisfies number as number &
    tags.Type<"int32"> &
    tags.Minimum<0>;
  const skip = (page - 1) * limit;
  const whereCondition = {
    product: {
      ecommerce_mall_seller_id: props.seller.id,
    },
    ...(props.body.status !== undefined && {
      status: { in: props.body.status },
    }),
    ...(props.body.created_at_from !== undefined && {
      created_at: { gte: new Date(props.body.created_at_from) },
    }),
    ...(props.body.created_at_to !== undefined && {
      created_at: { lte: new Date(props.body.created_at_to) },
    }),
    ...(props.body.product_id !== undefined && {
      ecommerce_mall_product_id: props.body.product_id,
    }),
    ...(props.body.variant_id !== undefined && {
      ecommerce_mall_product_variant_id: props.body.variant_id,
    }),
  } satisfies Prisma.ecommerce_mall_order_itemsWhereInput;
  const orderByCondition = (
    props.body.sort_by === "unit_price"
      ? {
          unit_price:
            props.body.sort_direction === "asc"
              ? ("asc" as const)
              : ("desc" as const),
        }
      : props.body.sort_by === "quantity"
        ? {
            quantity:
              props.body.sort_direction === "asc"
                ? ("asc" as const)
                : ("desc" as const),
          }
        : { created_at: "desc" as const }
  ) satisfies Prisma.ecommerce_mall_order_itemsOrderByWithRelationInput;
  const orderItems = await MyGlobal.prisma.ecommerce_mall_order_items.findMany({
    where: whereCondition,
    skip,
    take: limit,
    orderBy: orderByCondition,
    ...EcommerceMallOrderItemAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_mall_order_items.count({
    where: whereCondition,
  });
  return {
    data: await ArrayUtil.asyncMap(
      orderItems,
      EcommerceMallOrderItemAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
