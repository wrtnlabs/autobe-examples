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

export async function patchShoppingMallAdministratorProductsProductIdVariantsVariantIdInventoryRecords(props: {
  administrator: AdministratorPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  body: IShoppingMallInventoryRecord.IRequest;
}): Promise<IPageIShoppingMallInventoryRecord.ISummary> {
  await MyGlobal.prisma.shopping_mall_product_variants.findFirstOrThrow({
    where: {
      id: props.variantId,
      shopping_mall_product_id: props.productId,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const whereInput = {
    shopping_mall_product_variant_id: props.variantId,
    deleted_at: null,
    ...(props.body.reason !== undefined && {
      reason: {
        contains: props.body.reason,
        mode: "insensitive",
      },
    }),
    ...((props.body.occurred_from !== undefined ||
      props.body.occurred_to !== undefined) && {
      occurred_at: {
        ...(props.body.occurred_from !== undefined && {
          gte: props.body.occurred_from,
        }),
        ...(props.body.occurred_to !== undefined && {
          lte: props.body.occurred_to,
        }),
      },
    }),
  } satisfies Prisma.shopping_mall_inventory_recordsWhereInput;
  const orderByInput = (
    props.body.sort === "occurred_at_asc"
      ? [{ occurred_at: "asc" }, { created_at: "asc" }, { id: "asc" }]
      : props.body.sort === "created_at_desc"
        ? [{ created_at: "desc" }, { id: "desc" }]
        : props.body.sort === "created_at_asc"
          ? [{ created_at: "asc" }, { id: "asc" }]
          : [{ occurred_at: "desc" }, { created_at: "desc" }, { id: "desc" }]
  ) satisfies Prisma.shopping_mall_inventory_recordsOrderByWithRelationInput[];
  const data = await MyGlobal.prisma.shopping_mall_inventory_records.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    ...ShoppingMallInventoryRecordAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.shopping_mall_inventory_records.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallInventoryRecordAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
