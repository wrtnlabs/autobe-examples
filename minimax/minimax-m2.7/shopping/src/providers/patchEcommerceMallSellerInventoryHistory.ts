import { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
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

export async function patchEcommerceMallSellerInventoryHistory(props: {
  seller: SellerPayload;
  body: IEcommerceMallInventoryRecord.IRequest;
}): Promise<IPageIEcommerceMallInventoryRecord.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  if (props.body.variantId) {
    const variant =
      await MyGlobal.prisma.ecommerce_mall_product_variants.findUnique({
        where: { id: props.body.variantId },
        select: { id: true, ecommerce_mall_product_id: true },
      });
    if (!variant) {
      throw new HttpException("Variant not found", 404);
    }
    const product = await MyGlobal.prisma.ecommerce_mall_products.findUnique({
      where: { id: variant.ecommerce_mall_product_id },
      select: { id: true, ecommerce_mall_seller_id: true },
    });
    if (!product || product.ecommerce_mall_seller_id !== props.seller.id) {
      throw new HttpException("Forbidden", 403);
    }
  }
  const whereConditions = {
    productVariant: {
      product: {
        ecommerce_mall_seller_id: props.seller.id,
        deleted_at: null,
      },
      deleted_at: null,
    },
    ...(props.body.variantId && {
      ecommerce_mall_product_variant_id: props.body.variantId,
    }),
    ...(props.body.startDate && {
      created_at: {
        gte: new Date(props.body.startDate),
      },
    }),
    ...(props.body.endDate && {
      created_at: {
        lte: new Date(props.body.endDate),
      },
    }),
    ...(props.body.reason && {
      reason: {
        contains: props.body.reason,
        mode: Prisma.QueryMode.insensitive,
      },
    }),
  } satisfies Prisma.ecommerce_mall_inventory_recordsWhereInput;
  const data = await MyGlobal.prisma.ecommerce_mall_inventory_records.findMany({
    where: whereConditions,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...EcommerceMallInventoryRecordAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_mall_inventory_records.count({
    where: whereConditions,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallInventoryRecordAtSummaryTransformer.transform,
    ),
  };
}
