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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdministratorSellerProfilesSellerProfileIdSnapshots(props: {
  administrator: AdministratorPayload;
  sellerProfileId: string & tags.Format<"uuid">;
  body: IShoppingMallSellerProfileSnapshot.IRequest;
}): Promise<IPageIShoppingMallSellerProfileSnapshot.ISummary> {
  void props.administrator;
  const sellerProfile =
    await MyGlobal.prisma.shopping_mall_seller_profiles.findUniqueOrThrow({
      where: { id: props.sellerProfileId },
      select: {
        id: true,
        seller: {
          select: {
            id: true,
            email: true,
            approval_status: true,
            rejection_reason: true,
            account_status: true,
            approved_at: true,
            rejected_at: true,
            suspended_at: true,
            banned_at: true,
            last_login_at: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            sellerProfile: {
              select: {
                id: true,
                shop_name: true,
                shop_description: true,
                logo_image_url: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
              },
            },
          },
        },
      },
    });
  const seller = sellerProfile.seller;
  const sellerShopProfile = seller.sellerProfile;
  if (sellerShopProfile === null) throw new Error("sellerProfile is null");
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const sort: string = props.body.sort ?? "created_at:desc";
  const [sortField, sortDirection] = sort.split(":");
  const orderBy =
    sortField === "created_at" && sortDirection === "asc"
      ? ({
          created_at: "asc",
        } satisfies Prisma.shopping_mall_seller_profile_snapshotsOrderByWithRelationInput)
      : ({
          created_at: "desc",
        } satisfies Prisma.shopping_mall_seller_profile_snapshotsOrderByWithRelationInput);
  const snapshots =
    await MyGlobal.prisma.shopping_mall_seller_profile_snapshots.findMany({
      where: { shopping_mall_seller_profile_id: props.sellerProfileId },
      skip,
      take: limit,
      orderBy,
      select: {
        id: true,
        shopping_mall_seller_profile_id: true,
        shop_name: true,
        shop_description: true,
        logo_image_uri: true,
        created_at: true,
      },
    });
  const total =
    await MyGlobal.prisma.shopping_mall_seller_profile_snapshots.count({
      where: { shopping_mall_seller_profile_id: props.sellerProfileId },
    });
  const sellerProfileSummary = {
    id: sellerProfile.id,
    seller: {
      id: seller.id,
      email: seller.email,
      approvalStatus: seller.approval_status,
      rejectionReason: seller.rejection_reason,
      accountStatus: seller.account_status,
      approvedAt: seller.approved_at
        ? toISOStringSafe(seller.approved_at)
        : null,
      rejectedAt: seller.rejected_at
        ? toISOStringSafe(seller.rejected_at)
        : null,
      suspendedAt: seller.suspended_at
        ? toISOStringSafe(seller.suspended_at)
        : null,
      bannedAt: seller.banned_at ? toISOStringSafe(seller.banned_at) : null,
      lastLoginAt: seller.last_login_at
        ? toISOStringSafe(seller.last_login_at)
        : null,
      createdAt: toISOStringSafe(seller.created_at),
      updatedAt: toISOStringSafe(seller.updated_at),
      deletedAt: seller.deleted_at ? toISOStringSafe(seller.deleted_at) : null,
      sellerProfile: {
        id: sellerShopProfile.id,
        seller: undefined as never,
        shopName: sellerShopProfile.shop_name,
        shopDescription: sellerShopProfile.shop_description,
        logoImageUrl: sellerShopProfile.logo_image_url,
        created_at: toISOStringSafe(sellerShopProfile.created_at),
        updated_at: toISOStringSafe(sellerShopProfile.updated_at),
        deleted_at: sellerShopProfile.deleted_at
          ? toISOStringSafe(sellerShopProfile.deleted_at)
          : null,
      },
    },
    shopName: sellerShopProfile.shop_name,
    shopDescription: sellerShopProfile.shop_description,
    logoImageUrl: sellerShopProfile.logo_image_url,
    created_at: toISOStringSafe(sellerShopProfile.created_at),
    updated_at: toISOStringSafe(sellerShopProfile.updated_at),
    deleted_at: sellerShopProfile.deleted_at
      ? toISOStringSafe(sellerShopProfile.deleted_at)
      : null,
  } satisfies IShoppingMallSellerProfile.ISummary;
  const sellerSummary = {
    id: seller.id,
    email: seller.email,
    approvalStatus: seller.approval_status,
    rejectionReason: seller.rejection_reason,
    accountStatus: seller.account_status,
    approvedAt: seller.approved_at ? toISOStringSafe(seller.approved_at) : null,
    rejectedAt: seller.rejected_at ? toISOStringSafe(seller.rejected_at) : null,
    suspendedAt: seller.suspended_at
      ? toISOStringSafe(seller.suspended_at)
      : null,
    bannedAt: seller.banned_at ? toISOStringSafe(seller.banned_at) : null,
    lastLoginAt: seller.last_login_at
      ? toISOStringSafe(seller.last_login_at)
      : null,
    createdAt: toISOStringSafe(seller.created_at),
    updatedAt: toISOStringSafe(seller.updated_at),
    deletedAt: seller.deleted_at ? toISOStringSafe(seller.deleted_at) : null,
    sellerProfile: sellerProfileSummary,
  } satisfies IShoppingMallSeller.ISummary;
  const sellerProfileSummaryWithSeller = {
    ...sellerProfileSummary,
    seller: sellerSummary,
  } satisfies IShoppingMallSellerProfile.ISummary;
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: snapshots.map(
      (snapshot) =>
        ({
          id: snapshot.id,
          sellerProfile: sellerProfileSummaryWithSeller,
          shopName: snapshot.shop_name,
          shopDescription: snapshot.shop_description,
          logoImageUri: snapshot.logo_image_uri,
          createdAt: toISOStringSafe(snapshot.created_at),
        }) satisfies IShoppingMallSellerProfileSnapshot.ISummary,
    ),
  };
}
