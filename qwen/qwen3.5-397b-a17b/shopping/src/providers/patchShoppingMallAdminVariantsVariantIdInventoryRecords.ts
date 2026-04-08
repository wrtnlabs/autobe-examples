import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryRecord";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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
  await MyGlobal.prisma.shopping_mall_product_variants.findUniqueOrThrow({
    where: { id: props.variantId },
  });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const take = limit;
  const whereInput: Prisma.shopping_mall_inventory_recordsWhereInput = {
    shopping_mall_product_variant_id: props.variantId,
    ...(props.body.createdAtGte && {
      created_at: { gte: new Date(props.body.createdAtGte) },
    }),
    ...(props.body.createdAtLte && {
      created_at: { lte: new Date(props.body.createdAtLte) },
    }),
    ...(props.body.reason && { reason: props.body.reason }),
    ...(props.body.reasons && { reason: { in: props.body.reasons } }),
    ...(props.body.quantityDeltaMin !== undefined && {
      quantity_delta: { gte: props.body.quantityDeltaMin },
    }),
    ...(props.body.quantityDeltaMax !== undefined && {
      quantity_delta: { lte: props.body.quantityDeltaMax },
    }),
  };
  const sortField = props.body.sort ?? "created_at";
  const sortOrder = props.body.order === "ASC" ? "asc" : "desc";
  const orderByInput: Prisma.shopping_mall_inventory_recordsOrderByWithRelationInput =
    sortField === "quantity_delta"
      ? { quantity_delta: sortOrder }
      : sortField === "id"
        ? { id: sortOrder }
        : { created_at: sortOrder };
  const [records, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_inventory_records.findMany({
      where: whereInput,
      skip,
      take,
      orderBy: orderByInput,
      ...ShoppingMallInventoryRecordAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.shopping_mall_inventory_records.count({
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
    data: await ArrayUtil.asyncMap(
      records,
      ShoppingMallInventoryRecordAtSummaryTransformer.transform,
    ),
  };
}
