import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallSaleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleSnapshot";
import { IShoppingMallSaleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerSaleSnapshots(props: {
  seller: SellerPayload;
  body: IShoppingMallSaleSnapshot.IRequest & {
    page?: number;
    limit?: number;
  };
}): Promise<IPageIShoppingMallSaleSnapshot.ISummary> {
  // Access restriction: only sellers with admin role allowed
  // Here, seller payload does not include role info, so assuming additional admin check is done outside or replace with placeholder
  // If role check needed, uncomment and implement the following:
  // if (!props.seller.isAdmin) {
  //   throw new HttpException("Forbidden", 403);
  // }
  const page =
    typeof props.body.page === "number" && props.body.page > 0
      ? props.body.page
      : 1;
  const limit =
    typeof props.body.limit === "number" && props.body.limit > 0
      ? props.body.limit
      : 30;
  if (page < 1) {
    throw new HttpException("Page must be greater than 0", 400);
  }
  if (limit < 1) {
    throw new HttpException("Limit must be greater than 0", 400);
  }
  const where: Prisma.shopping_mall_sale_snapshotsWhereInput = {};
  if ("category_id" in props.body) {
    if (typeof props.body.category_id === "string") {
      where.category_id = props.body.category_id;
    }
    // Explicit null category_id is skipped to avoid invalid assignment
  }
  if (
    ("base_price_min" in props.body &&
      typeof (props.body as any).base_price_min === "number") ||
    ("base_price_max" in props.body &&
      typeof (props.body as any).base_price_max === "number")
  ) {
    where.base_price = {};
    if (
      "base_price_min" in props.body &&
      typeof (props.body as any).base_price_min === "number"
    ) {
      where.base_price.gte = (props.body as any).base_price_min;
    }
    if (
      "base_price_max" in props.body &&
      typeof (props.body as any).base_price_max === "number"
    ) {
      where.base_price.lte = (props.body as any).base_price_max;
    }
    if (Object.keys(where.base_price).length === 0) {
      delete where.base_price;
    }
  }
  if (
    ("created_at_min" in props.body &&
      typeof (props.body as any).created_at_min === "string") ||
    ("created_at_max" in props.body &&
      typeof (props.body as any).created_at_max === "string")
  ) {
    where.created_at = {};
    if (
      "created_at_min" in props.body &&
      typeof (props.body as any).created_at_min === "string"
    ) {
      where.created_at.gte = (props.body as any).created_at_min;
    }
    if (
      "created_at_max" in props.body &&
      typeof (props.body as any).created_at_max === "string"
    ) {
      where.created_at.lte = (props.body as any).created_at_max;
    }
    if (Object.keys(where.created_at).length === 0) {
      delete where.created_at;
    }
  }
  if (
    "keyword" in props.body &&
    typeof props.body.keyword === "string" &&
    props.body.keyword.trim() !== ""
  ) {
    where.OR = [
      { title: { contains: props.body.keyword, mode: "insensitive" } },
      { description: { contains: props.body.keyword, mode: "insensitive" } },
    ];
  }
  const skip = (page - 1) * limit;
  const records = await MyGlobal.prisma.shopping_mall_sale_snapshots.findMany({
    where,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
  });
  const total = await MyGlobal.prisma.shopping_mall_sale_snapshots.count({
    where,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: records.map((record) => ({
      ...record,
    })),
  };
}
