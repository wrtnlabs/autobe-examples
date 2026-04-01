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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ShoppingMallInventoryRecordAtSummaryTransformer } from "../transformers/ShoppingMallInventoryRecordAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallMemberInventoryRecords(props: {
  member: MemberPayload;
  body: IShoppingMallInventoryRecord.IRequest;
}): Promise<IPageIShoppingMallInventoryRecord.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const createdAtFrom = props.body.createdAtFrom;
  const createdAtTo = props.body.createdAtTo;
  if (createdAtFrom !== undefined && createdAtTo !== undefined) {
    if (createdAtFrom > createdAtTo) {
      throw new HttpException("createdAtFrom must be <= createdAtTo", 400);
    }
  }
  const whereInput = {
    deleted_at: null,
    ...(props.body.productVariantId !== undefined
      ? { shopping_mall_product_variant_id: props.body.productVariantId }
      : {}),
    ...(props.body.productVariantId !== undefined
      ? {
          shopping_mall_product_variant_id: props.body.productVariantId,
        }
      : {}),
  } satisfies Prisma.shopping_mall_inventory_recordsWhereInput;
  // scoping: seller owns product variants
  const variantWhere = {
    ...(props.body.productVariantId !== undefined
      ? { id: props.body.productVariantId }
      : {}),
    product: {
      shopping_mall_seller_id: props.member.id,
    },
  } satisfies Prisma.shopping_mall_product_variantsWhereInput;
  const recordsWhere = {
    ...whereInput,
    ...(props.body.createdAtFrom !== undefined
      ? { created_at: { gte: new Date(props.body.createdAtFrom) } }
      : {}),
    ...(props.body.createdAtTo !== undefined
      ? { created_at: { lte: new Date(props.body.createdAtTo) } }
      : {}),
  } as any;
  const [items, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_inventory_records.findMany({
      where: recordsWhere,
      orderBy: [{ created_at: "desc" }, { id: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
      ...ShoppingMallInventoryRecordAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.shopping_mall_inventory_records.count({
      where: recordsWhere,
    }),
  ]);
  return {
    data: await ArrayUtil.asyncMap(
      items,
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
