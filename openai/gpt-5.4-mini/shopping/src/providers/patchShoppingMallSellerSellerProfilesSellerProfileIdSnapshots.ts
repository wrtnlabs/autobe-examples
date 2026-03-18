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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerSellerProfilesSellerProfileIdSnapshots(props: {
  seller: SellerPayload;
  sellerProfileId: string & tags.Format<"uuid">;
  body: IShoppingMallSellerProfileSnapshot.IRequest;
}): Promise<IPageIShoppingMallSellerProfileSnapshot.ISummary> {
  const sellerProfile =
    await MyGlobal.prisma.shopping_mall_seller_profiles.findUniqueOrThrow({
      where: { id: props.sellerProfileId },
      select: {
        id: true,
        shopping_mall_seller_id: true,
      },
    });
  if (sellerProfile.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const sort = props.body.sort ?? "created_at:desc";
  const separatorIndex = sort.indexOf(":");
  const sortField =
    separatorIndex >= 0 ? sort.substring(0, separatorIndex) : "created_at";
  const sortDirection =
    separatorIndex >= 0 ? sort.substring(separatorIndex + 1) : "desc";
  const orderBy = (
    sortField === "created_at" && sortDirection === "asc"
      ? { created_at: "asc" }
      : { created_at: "desc" }
  ) satisfies Prisma.shopping_mall_seller_profile_snapshotsOrderByWithRelationInput;
  const snapshots =
    await MyGlobal.prisma.shopping_mall_seller_profile_snapshots.findMany({
      where: {
        shopping_mall_seller_profile_id: props.sellerProfileId,
      },
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
  const records =
    await MyGlobal.prisma.shopping_mall_seller_profile_snapshots.count({
      where: {
        shopping_mall_seller_profile_id: props.sellerProfileId,
      },
    });
  return {
    data: snapshots.map((snapshot) => ({
      id: snapshot.id,
      sellerProfile: {
        id: snapshot.shopping_mall_seller_profile_id,
        seller: {
          id: props.seller.id,
          email: "",
          approvalStatus: "",
          rejectionReason: null,
          accountStatus: "",
          approvedAt: null,
          rejectedAt: null,
          suspendedAt: null,
          bannedAt: null,
          lastLoginAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          deletedAt: null,
          sellerProfile: {
            id: snapshot.shopping_mall_seller_profile_id,
            seller: {
              id: props.seller.id,
              email: "",
              approvalStatus: "",
              rejectionReason: null,
              accountStatus: "",
              approvedAt: null,
              rejectedAt: null,
              suspendedAt: null,
              bannedAt: null,
              lastLoginAt: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              deletedAt: null,
              sellerProfile: null as never,
            },
            shopName: snapshot.shop_name,
            shopDescription: snapshot.shop_description,
            logoImageUrl: snapshot.logo_image_uri ?? "",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            deleted_at: null,
          },
        },
        shopName: snapshot.shop_name,
        shopDescription: snapshot.shop_description,
        logoImageUrl: snapshot.logo_image_uri ?? "",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
      },
      shopName: snapshot.shop_name,
      shopDescription: snapshot.shop_description,
      logoImageUri: snapshot.logo_image_uri,
      createdAt: snapshot.created_at.toISOString(),
    })),
    pagination: {
      current: page,
      limit,
      records,
      pages: Math.ceil(records / limit),
    },
  };
}
