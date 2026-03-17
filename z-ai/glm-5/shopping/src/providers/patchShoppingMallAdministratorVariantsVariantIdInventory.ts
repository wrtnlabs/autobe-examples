import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryRecord";
import { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ShoppingMallInventoryRecordAtSummaryTransformer } from "../transformers/ShoppingMallInventoryRecordAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdministratorVariantsVariantIdInventory(props: {
  administrator: AdministratorPayload;
  variantId: string;
  body: IShoppingMallInventoryRecord.IRequest;
}): Promise<IPageIShoppingMallInventoryRecord.ISummary> {
  // Verify variant exists and is not soft-deleted
  await MyGlobal.prisma.shopping_mall_product_variants.findUniqueOrThrow({
    where: {
      id: props.variantId,
      deleted_at: null,
    },
  });
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  // Build where clause
  const whereInput = {
    variant_id: props.variantId,
    ...(props.body.reason && {
      reason: { contains: props.body.reason, mode: "insensitive" as const },
    }),
    ...(props.body.quantityChangeType === "positive" && {
      quantity_change: { gt: 0 },
    }),
    ...(props.body.quantityChangeType === "negative" && {
      quantity_change: { lt: 0 },
    }),
    ...(props.body.createdFrom && {
      created_at: { gte: new Date(props.body.createdFrom) },
    }),
    ...(props.body.createdTo && {
      created_at: { lte: new Date(props.body.createdTo) },
    }),
    ...(props.body.sourceType === "manual" && { seller_id: { not: null } }),
    ...(props.body.sourceType === "order" && { order_id: { not: null } }),
    ...(props.body.sourceType === "cancellation" && {
      cancellation_request_id: { not: null },
    }),
    ...(props.body.sourceType === "refund" && {
      refund_request_id: { not: null },
    }),
  } satisfies Prisma.shopping_mall_inventory_recordsWhereInput;
  // Query data with pagination
  const data = await MyGlobal.prisma.shopping_mall_inventory_records.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...ShoppingMallInventoryRecordAtSummaryTransformer.select(),
  });
  // Query total count
  const total = await MyGlobal.prisma.shopping_mall_inventory_records.count({
    where: whereInput,
  });
  // Transform and return
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallInventoryRecordAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
