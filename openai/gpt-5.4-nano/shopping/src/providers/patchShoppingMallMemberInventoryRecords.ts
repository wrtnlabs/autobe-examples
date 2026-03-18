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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallMemberInventoryRecords(props: {
  member: MemberPayload;
  body: IShoppingMallInventoryRecord.IRequest;
}): Promise<IPageIShoppingMallInventoryRecord.ISummary> {
  const page = props.body.page ?? (1 satisfies number & tags.Minimum<1>);
  const limit = props.body.limit ?? (100 satisfies number & tags.Maximum<100>);
  if (
    props.body.createdAtFrom !== undefined &&
    props.body.createdAtTo !== undefined &&
    props.body.createdAtFrom > props.body.createdAtTo
  ) {
    throw new HttpException(
      "createdAtFrom must be less than or equal to createdAtTo",
      400,
    );
  }
  const whereInput = {
    ...(props.body.productVariantId !== undefined && {
      shopping_mall_product_variant_id: props.body.productVariantId,
    }),
    ...(props.body.createdAtFrom !== undefined && {
      created_at: {
        ...(props.body.createdAtTo === undefined
          ? { gte: props.body.createdAtFrom }
          : { gte: props.body.createdAtFrom, lte: props.body.createdAtTo }),
      },
    }),
    ...(props.body.createdAtFrom === undefined &&
      props.body.createdAtTo !== undefined && {
        created_at: { lte: props.body.createdAtTo },
      }),
    productVariant: {
      product: {
        shopping_mall_seller_id: props.member.id,
      },
    },
  } satisfies Prisma.shopping_mall_inventory_recordsWhereInput;
  const skip = (page - 1) * limit;
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_inventory_records.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: [{ created_at: "desc" }, { id: "desc" }],
      select: {
        id: true,
        shopping_mall_product_variant_id: true,
        stock_quantity: true,
        reserved_quantity: true,
        available_quantity: true,
        created_at: true,
        deleted_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_inventory_records.count({
      where: whereInput,
    }),
  ]);
  const data = rows.map(
    (r) =>
      ({
        id: r.id,
        shopping_mall_product_variant_id: r.shopping_mall_product_variant_id,
        stock_quantity: r.stock_quantity,
        reserved_quantity: r.reserved_quantity,
        available_quantity: r.available_quantity,
        created_at: toISOStringSafe(r.created_at),
        deleted_at:
          r.deleted_at === null ? null : toISOStringSafe(r.deleted_at),
      }) satisfies IShoppingMallInventoryRecord.ISummary,
  );
  const pages = total === 0 ? 0 : Math.ceil(total / limit);
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages,
    },
    data,
  } satisfies IPageIShoppingMallInventoryRecord.ISummary;
}
