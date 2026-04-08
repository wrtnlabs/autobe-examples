import { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallInventoryRecord";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallInventoryRecordAtSummaryTransformer } from "../transformers/EcommerceMallInventoryRecordAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerInventoryRecords(props: {
  seller: SellerPayload;
  body: IEcommerceMallInventoryRecord.IRequest;
}): Promise<IPageIEcommerceMallInventoryRecord.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where clause with filters
  const where: Prisma.ecommerce_mall_inventory_recordsWhereInput = {
    // Seller ownership filter through variant -> product -> seller
    variant: {
      product: {
        seller_id: props.seller.id,
      },
    },
    // Optional variant filter
    ...(props.body.variantId && {
      product_variant_id: props.body.variantId,
    }),
    // Optional reason filter
    ...(props.body.reason && {
      reason: props.body.reason,
    }),
    // Optional date range filter
    ...((props.body.dateRangeFrom || props.body.dateRangeTo) && {
      created_at: {
        ...(props.body.dateRangeFrom && {
          gte: new Date(props.body.dateRangeFrom),
        }),
        ...(props.body.dateRangeTo && {
          lte: new Date(props.body.dateRangeTo),
        }),
      },
    }),
    // Optional quantity direction filter
    ...(props.body.quantityDirection === "positive" && {
      quantity_change: { gt: 0 },
    }),
    ...(props.body.quantityDirection === "negative" && {
      quantity_change: { lt: 0 },
    }),
    // Optional product filter through variant
    ...(props.body.productId && {
      variant: {
        product_id: props.body.productId,
      },
    }),
  };
  // Determine sort order
  const sortDirection = props.body.sortDirection ?? "desc";
  const orderBy: Prisma.ecommerce_mall_inventory_recordsOrderByWithRelationInput =
    {
      created_at: sortDirection,
    };
  // Query data and count
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_inventory_records.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      ...EcommerceMallInventoryRecordAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_mall_inventory_records.count({ where }),
  ]);
  // Transform results
  const transformed = await ArrayUtil.asyncMap(
    data,
    EcommerceMallInventoryRecordAtSummaryTransformer.transform,
  );
  return {
    data: transformed,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
