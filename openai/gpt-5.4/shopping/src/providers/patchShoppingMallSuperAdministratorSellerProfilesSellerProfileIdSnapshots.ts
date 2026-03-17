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
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { ShoppingMallSellerProfileSnapshotAtSummaryTransformer } from "../transformers/ShoppingMallSellerProfileSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSuperAdministratorSellerProfilesSellerProfileIdSnapshots(props: {
  superAdministrator: SuperadministratorPayload;
  sellerProfileId: string & tags.Format<"uuid">;
  body: IShoppingMallSellerProfileSnapshot.IRequest;
}): Promise<IPageIShoppingMallSellerProfileSnapshot.ISummary> {
  await MyGlobal.prisma.shopping_mall_super_administrators.findUniqueOrThrow({
    where: {
      id: props.superAdministrator.id,
    },
    select: {
      id: true,
      active: true,
      deleted_at: true,
    },
  });
  await MyGlobal.prisma.shopping_mall_seller_profiles.findUniqueOrThrow({
    where: {
      id: props.sellerProfileId,
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
  const whereInput = {
    shopping_mall_seller_profile_id: props.sellerProfileId,
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
              ? {
                  gte: new globalThis.Date(props.body.changedAtFrom),
                }
              : {}),
            ...(props.body.changedAtTo !== undefined
              ? {
                  lte: new globalThis.Date(props.body.changedAtTo),
                }
              : {}),
          },
        }
      : {}),
  } satisfies Prisma.shopping_mall_seller_profile_snapshotsWhereInput;
  const orderByInput: Prisma.shopping_mall_seller_profile_snapshotsOrderByWithRelationInput[] =
    sortBy === "changed_at"
      ? [{ changed_at: sortOrder }, { created_at: "desc" }, { id: "asc" }]
      : sortBy === "created_at"
        ? [{ created_at: sortOrder }, { id: "asc" }]
        : sortBy === "shop_name"
          ? [{ shop_name: sortOrder }, { changed_at: "desc" }, { id: "asc" }]
          : [
              { changed_summary: sortOrder },
              { changed_at: "desc" },
              { id: "asc" },
            ];
  const snapshots =
    await MyGlobal.prisma.shopping_mall_seller_profile_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        changed_at: true,
        shop_name: true,
        changed_summary: true,
        shop_description: true,
        logo_uri: true,
        sellerProfile: {
          select: {
            id: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            shop_name: true,
            shop_description: true,
            logo_uri: true,
            seller: {
              select: {
                id: true,
                email: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
                banned: true,
                approval_status: true,
                rejection_reason: true,
                suspended: true,
              },
            },
          },
        },
      },
    });
  const total =
    await MyGlobal.prisma.shopping_mall_seller_profile_snapshots.count({
      where: whereInput,
    });
  return {
    data: await ArrayUtil.asyncMap(
      snapshots,
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
