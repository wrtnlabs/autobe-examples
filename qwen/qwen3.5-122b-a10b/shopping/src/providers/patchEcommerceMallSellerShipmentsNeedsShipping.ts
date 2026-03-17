import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
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

export async function patchEcommerceMallSellerShipmentsNeedsShipping(props: {
  seller: SellerPayload;
  body: IEcommerceMallOrderItem.IRequest;
}): Promise<IPageIEcommerceMallOrderItem.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_mall_order_itemsWhereInput = {
    deleted_at: null,
    status: props.body.status
      ? Array.isArray(props.body.status)
        ? { in: props.body.status }
        : props.body.status
      : "paid",
    productVariant: {
      product: {
        seller_id: props.seller.id,
        deleted_at: null,
      },
    },
    ...(props.body.created_at_from && {
      created_at: {
        gte: new Date(props.body.created_at_from),
      },
    }),
    ...(props.body.created_at_to && {
      created_at: {
        lte: new Date(props.body.created_at_to),
      },
    }),
    ...(props.body.order_id && {
      ecommerce_mall_order_id: props.body.order_id,
    }),
    ...(props.body.product_variant_id && {
      ecommerce_mall_product_variant_id: props.body.product_variant_id,
    }),
  } satisfies Prisma.ecommerce_mall_order_itemsWhereInput;
  const orderByInput: Prisma.ecommerce_mall_order_itemsOrderByWithRelationInput =
    props.body.sort_by === "status"
      ? { status: (props.body.sort_order ?? "desc") as "asc" | "desc" }
      : props.body.sort_by === "quantity"
        ? { quantity: (props.body.sort_order ?? "desc") as "asc" | "desc" }
        : props.body.sort_by === "unit_price"
          ? { unit_price: (props.body.sort_order ?? "desc") as "asc" | "desc" }
          : { created_at: (props.body.sort_order ?? "desc") as "asc" | "desc" };
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_order_items.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      ...EcommerceMallOrderItemAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_mall_order_items.count({
      where: whereInput,
    }),
  ]);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await Promise.all(
      data.map((item) =>
        EcommerceMallOrderItemAtSummaryTransformer.transform(item),
      ),
    ),
  };
}
