import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryRecord";
import { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallInventoryRecordAtSummaryTransformer } from "../transformers/ShoppingMallInventoryRecordAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdminVariantsVariantIdInventoryRecords(props: {
  admin: AdminPayload;
  variantId: string & tags.Format<"uuid">;
  body: IShoppingMallInventoryRecord.IRequest;
}): Promise<IPageIShoppingMallInventoryRecord.ISummary> {
  // Step 1: Verify variant exists (404 if not found)
  await MyGlobal.prisma.shopping_mall_product_variants.findUniqueOrThrow({
    where: { id: props.variantId },
    select: { id: true },
  });
  // Step 2: Pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Step 3: Build date range filter safely (avoid key collision on created_at)
  const createdAtFilter:
    | {
        gte?: Date;
        lte?: Date;
      }
    | undefined =
    props.body.dateFrom !== undefined || props.body.dateTo !== undefined
      ? {
          ...(props.body.dateFrom !== undefined && {
            gte: new Date(props.body.dateFrom),
          }),
          ...(props.body.dateTo !== undefined && {
            lte: new Date(props.body.dateTo),
          }),
        }
      : undefined;
  // Step 4: Build WHERE clause
  const whereInput = {
    shopping_mall_product_variant_id: props.variantId,
    ...(props.body.reasonTypes !== undefined &&
      props.body.reasonTypes.length > 0 && {
        reason_type: { in: props.body.reasonTypes },
      }),
    ...(createdAtFilter !== undefined && {
      created_at: createdAtFilter,
    }),
  } satisfies Prisma.shopping_mall_inventory_recordsWhereInput;
  // Step 5: Sort direction
  const orderByInput = (
    props.body.sort === "desc"
      ? { created_at: "desc" as const }
      : { created_at: "asc" as const }
  ) satisfies Prisma.shopping_mall_inventory_recordsOrderByWithRelationInput;
  // Step 6: Query records and total count sequentially
  const data = await MyGlobal.prisma.shopping_mall_inventory_records.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...ShoppingMallInventoryRecordAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.shopping_mall_inventory_records.count({
    where: whereInput,
  });
  // Step 7: Transform and return paginated result
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallInventoryRecordAtSummaryTransformer.transform,
    ),
  };
}
