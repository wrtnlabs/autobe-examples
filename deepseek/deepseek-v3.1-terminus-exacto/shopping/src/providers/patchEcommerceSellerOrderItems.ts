import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceOrderItem";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceOrderItemAtSummaryTransformer } from "../transformers/EcommerceOrderItemAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceSellerOrderItems(props: {
  seller: SellerPayload;
  body: IEcommerceOrderItem.IRequest;
}): Promise<IPageIEcommerceOrderItem.ISummary> {
  const page = Math.max(1, props.body.page ?? 1);
  const limit = Math.min(100, Math.max(1, props.body.limit ?? 20));
  const skip = (page - 1) * limit;
  // Strip Typia tags from numeric values for Prisma compatibility
  const minQuantity =
    props.body.min_quantity !== undefined
      ? Number(props.body.min_quantity)
      : undefined;
  const maxQuantity =
    props.body.max_quantity !== undefined
      ? Number(props.body.max_quantity)
      : undefined;
  const minUnitPrice =
    props.body.min_unit_price !== undefined
      ? Number(props.body.min_unit_price)
      : undefined;
  const maxUnitPrice =
    props.body.max_unit_price !== undefined
      ? Number(props.body.max_unit_price)
      : undefined;
  const minTotalPrice =
    props.body.min_total_price !== undefined
      ? Number(props.body.min_total_price)
      : undefined;
  const maxTotalPrice =
    props.body.max_total_price !== undefined
      ? Number(props.body.max_total_price)
      : undefined;
  // Build WHERE clause with seller authorization
  const whereInput = {
    seller_id: props.seller.id,
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.product_variant_id && {
      product_variant_id: props.body.product_variant_id,
    }),
    ...(minQuantity !== undefined && {
      quantity: { gte: minQuantity },
    }),
    ...(maxQuantity !== undefined && {
      quantity: { lte: maxQuantity },
    }),
    ...(minUnitPrice !== undefined && {
      unit_price: { gte: minUnitPrice },
    }),
    ...(maxUnitPrice !== undefined && {
      unit_price: { lte: maxUnitPrice },
    }),
    ...(minTotalPrice !== undefined && {
      total_price: { gte: minTotalPrice },
    }),
    ...(maxTotalPrice !== undefined && {
      total_price: { lte: maxTotalPrice },
    }),
  } satisfies Prisma.ecommerce_order_itemsWhereInput;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_order_items.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { id: "desc" },
      ...EcommerceOrderItemAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_order_items.count({
      where: whereInput,
    }),
  ]);
  const transformedData = await ArrayUtil.asyncMap(
    data,
    EcommerceOrderItemAtSummaryTransformer.transform,
  );
  const pages = limit > 0 ? Math.ceil(total / limit) : 0;
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages,
    } satisfies IPage.IPagination,
  };
}
