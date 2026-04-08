import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceInventoryRecord";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceInventoryRecord";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceInventoryRecordAtSummaryTransformer } from "../transformers/EcommerceInventoryRecordAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceSellerInventoryAnalytics(props: {
  seller: SellerPayload;
  body: IEcommerceInventoryRecord.IRequest;
}): Promise<IPageIEcommerceInventoryRecord.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const sort_by = props.body.sort_by ?? "created_at";
  const sort_order = props.body.sort_order ?? "desc";
  const baseProductVariant: Prisma.ecommerce_inventory_recordsWhereInput["productVariant"] =
    {
      deleted_at: null,
      product: {
        seller_id: props.seller.id,
        deleted_at: null,
      },
    };
  const where: Prisma.ecommerce_inventory_recordsWhereInput = {
    deleted_at: null,
    productVariant:
      props.body.ecommerce_product_variant_id !== undefined
        ? {
            ...baseProductVariant,
            id: props.body.ecommerce_product_variant_id,
          }
        : baseProductVariant,
  };
  const quantityChangeFilter: Record<string, number> = {};
  if (props.body.quantity_change_min !== undefined) {
    quantityChangeFilter.gte = props.body.quantity_change_min;
  }
  if (props.body.quantity_change_max !== undefined) {
    quantityChangeFilter.lte = props.body.quantity_change_max;
  }
  if (Object.keys(quantityChangeFilter).length > 0) {
    where.quantity_change = quantityChangeFilter;
  }
  if (props.body.reason !== undefined) {
    where.reason = props.body.reason;
  } else if (
    props.body.reasons !== undefined &&
    props.body.reasons.length > 0
  ) {
    where.reason = {
      in: props.body.reasons,
    };
  }
  const createdAtFilter: Record<string, Date> = {};
  if (props.body.created_at_from !== undefined) {
    createdAtFilter.gte = new Date(props.body.created_at_from);
  }
  if (props.body.created_at_to !== undefined) {
    createdAtFilter.lte = new Date(props.body.created_at_to);
  }
  if (Object.keys(createdAtFilter).length > 0) {
    where.created_at = createdAtFilter;
  }
  const orderByInput = {
    [sort_by]: sort_order,
  } satisfies Prisma.ecommerce_inventory_recordsOrderByWithRelationInput;
  const records = await MyGlobal.prisma.ecommerce_inventory_records.findMany({
    where,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...EcommerceInventoryRecordAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_inventory_records.count({
    where,
  });
  const data = await ArrayUtil.asyncMap(
    records,
    EcommerceInventoryRecordAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
