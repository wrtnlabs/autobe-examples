import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerProfileSnapshot";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { IShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfileSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallSellerProfileSnapshotAtSummaryTransformer } from "../transformers/ShoppingMallSellerProfileSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerProfileSnapshots(props: {
  seller: SellerPayload;
  body: IShoppingMallSellerProfileSnapshot.IRequest;
}): Promise<IPageIShoppingMallSellerProfileSnapshot.ISummary> {
  const sellerProfile =
    await MyGlobal.prisma.shopping_mall_seller_profiles.findUniqueOrThrow({
      where: {
        shopping_mall_seller_id: props.seller.id,
      },
      select: {
        id: true,
      },
    });
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const sortBy: "changed_at" | "created_at" | "shop_name" | "changed_summary" =
    props.body.sortBy ?? "changed_at";
  const sortOrder: "asc" | "desc" = props.body.sortOrder ?? "desc";
  const where = {
    shopping_mall_seller_profile_id: sellerProfile.id,
    ...(props.body.search !== undefined
      ? {
          OR: [
            {
              shop_name: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
            {
              shop_description: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
            {
              changed_summary: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
          ],
        }
      : {}),
    ...(props.body.changedAtFrom !== undefined ||
    props.body.changedAtTo !== undefined
      ? {
          changed_at: {
            ...(props.body.changedAtFrom !== undefined
              ? { gte: new globalThis.Date(props.body.changedAtFrom) }
              : {}),
            ...(props.body.changedAtTo !== undefined
              ? { lte: new globalThis.Date(props.body.changedAtTo) }
              : {}),
          },
        }
      : {}),
  } satisfies Prisma.shopping_mall_seller_profile_snapshotsWhereInput;
  const orderBy = [
    sortBy === "changed_at"
      ? { changed_at: sortOrder }
      : sortBy === "created_at"
        ? { created_at: sortOrder }
        : sortBy === "shop_name"
          ? { shop_name: sortOrder }
          : { changed_summary: sortOrder },
    { id: sortOrder },
  ] satisfies Prisma.shopping_mall_seller_profile_snapshotsOrderByWithRelationInput[];
  const rows =
    await MyGlobal.prisma.shopping_mall_seller_profile_snapshots.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      ...ShoppingMallSellerProfileSnapshotAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.shopping_mall_seller_profile_snapshots.count({
      where,
    });
  return {
    data: await ArrayUtil.asyncMap(
      rows,
      ShoppingMallSellerProfileSnapshotAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
