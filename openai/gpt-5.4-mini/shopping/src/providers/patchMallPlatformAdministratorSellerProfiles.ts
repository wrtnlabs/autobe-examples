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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformAdministratorSellerProfiles(props: {
  administrator: AdministratorPayload;
  body: IMallPlatformSellerProfile.IRequest;
}): Promise<IPageIMallPlatformSellerProfile.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const search: string | undefined = props.body.search?.trim();
  const where = {
    deleted_at: null,
    ...(search !== undefined && search.length > 0
      ? {
          OR: [
            { shop_name: { contains: search, mode: "insensitive" } },
            { shop_description: { contains: search, mode: "insensitive" } },
            {
              sellerAccount: {
                email: { contains: search, mode: "insensitive" },
              },
            },
          ],
        }
      : {}),
  } satisfies Prisma.mall_platform_seller_profilesWhereInput;
  const orderBy = (
    props.body.sort === "oldest"
      ? [{ created_at: "asc" as const }, { id: "asc" as const }]
      : props.body.sort === "shopName_asc"
        ? [{ shop_name: "asc" as const }, { id: "asc" as const }]
        : props.body.sort === "shopName_desc"
          ? [{ shop_name: "desc" as const }, { id: "asc" as const }]
          : [{ created_at: "desc" as const }, { id: "asc" as const }]
  ) satisfies Prisma.mall_platform_seller_profilesOrderByWithRelationInput[];
  const records = await MyGlobal.prisma.mall_platform_seller_profiles.findMany({
    where,
    orderBy,
    skip,
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
  const total: number =
    await MyGlobal.prisma.mall_platform_seller_profiles.count({ where });
  const pagination = {
    current: page,
    limit,
    records: total,
    pages: Math.ceil(total / limit),
  } satisfies IPage.IPagination;
  return {
    data: records.map(
      (record) =>
        ({
          id: record.id,
          sellerAccount: {
            id: record.sellerAccount.id,
            email: record.sellerAccount.email,
            approvalStatus: record.sellerAccount.approval_status,
            rejectionReason: record.sellerAccount.rejection_reason ?? null,
            suspendedAt:
              record.sellerAccount.suspended_at !== null
                ? toISOStringSafe(record.sellerAccount.suspended_at)
                : null,
            deletedAt:
              record.sellerAccount.deleted_at !== null
                ? toISOStringSafe(record.sellerAccount.deleted_at)
                : null,
            createdAt: toISOStringSafe(record.sellerAccount.created_at),
            updatedAt: toISOStringSafe(record.sellerAccount.updated_at),
          } satisfies IMallPlatformSellerAccount.ISummary,
          shopName: record.shop_name,
          shopDescription: record.shop_description,
          logoImageUri: record.logo_image_uri ?? null,
          createdAt: toISOStringSafe(record.created_at),
          updatedAt: toISOStringSafe(record.updated_at),
          deletedAt:
            record.deleted_at !== null
              ? toISOStringSafe(record.deleted_at)
              : null,
        }) satisfies IMallPlatformSellerProfile.ISummary,
    ),
    pagination,
  };
}
