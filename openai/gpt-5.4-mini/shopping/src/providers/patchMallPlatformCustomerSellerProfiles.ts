import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformSellerProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformCustomerSellerProfiles(props: {
  customer: CustomerPayload;
  body: IMallPlatformSellerProfile.IRequest;
}): Promise<IPageIMallPlatformSellerProfile.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  if (page < 1) throw new HttpException("Invalid page", 400);
  if (limit < 1 || limit > 100) throw new HttpException("Invalid limit", 400);
  const sort = props.body.sort ?? "newest";
  if (
    sort !== "newest" &&
    sort !== "oldest" &&
    sort !== "shopName_asc" &&
    sort !== "shopName_desc"
  ) {
    throw new HttpException("Invalid sort", 400);
  }
  const orderBy: Prisma.mall_platform_seller_profilesOrderByWithRelationInput[] =
    sort === "oldest"
      ? [{ created_at: "asc" }, { id: "asc" }]
      : sort === "shopName_asc"
        ? [{ shop_name: "asc" }, { id: "asc" }]
        : sort === "shopName_desc"
          ? [{ shop_name: "desc" }, { id: "asc" }]
          : [{ created_at: "desc" }, { id: "asc" }];
  const where: Prisma.mall_platform_seller_profilesWhereInput = {
    deleted_at: null,
    ...(props.body.search === undefined
      ? {}
      : {
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
          ],
        }),
  };
  const data = await MyGlobal.prisma.mall_platform_seller_profiles.findMany({
    where,
    orderBy,
    skip: (page - 1) * limit,
    take: limit,
    select: {
      id: true,
      shop_name: true,
      shop_description: true,
      logo_image_uri: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      sellerAccount: {
        select: {
          id: true,
          email: true,
          approval_status: true,
          rejection_reason: true,
          suspended_at: true,
          deleted_at: true,
          created_at: true,
          updated_at: true,
        },
      },
    },
  });
  const total = await MyGlobal.prisma.mall_platform_seller_profiles.count({
    where,
  });
  return {
    data: data.map(
      (record) =>
        ({
          id: record.id,
          sellerAccount: {
            id: record.sellerAccount.id,
            email: record.sellerAccount.email,
            approvalStatus: record.sellerAccount.approval_status,
            rejectionReason: record.sellerAccount.rejection_reason,
            suspendedAt: toISOStringSafe(
              record.sellerAccount.suspended_at ??
                new Date("9999-12-31T23:59:59.999Z"),
            ),
            deletedAt: toISOStringSafe(
              record.sellerAccount.deleted_at ??
                new Date("9999-12-31T23:59:59.999Z"),
            ),
            createdAt: toISOStringSafe(record.sellerAccount.created_at),
            updatedAt: toISOStringSafe(record.sellerAccount.updated_at),
          } satisfies IMallPlatformSellerAccount.ISummary,
          shopName: record.shop_name,
          shopDescription: record.shop_description,
          logoImageUri: record.logo_image_uri,
          createdAt: toISOStringSafe(record.created_at),
          updatedAt: toISOStringSafe(record.updated_at),
          deletedAt: toISOStringSafe(
            record.deleted_at ?? new Date("9999-12-31T23:59:59.999Z"),
          ),
        }) satisfies IMallPlatformSellerProfile.ISummary,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  } satisfies IPageIMallPlatformSellerProfile.ISummary;
}
