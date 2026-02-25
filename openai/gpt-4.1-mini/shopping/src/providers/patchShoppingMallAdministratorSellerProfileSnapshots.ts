import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerProfileSnapshot";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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

export async function patchShoppingMallAdministratorSellerProfileSnapshots(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallSellerProfileSnapshot.IRequest;
}): Promise<IPageIShoppingMallSellerProfileSnapshot.ISummary> {
  const {
    sellerId,
    createdAtGte,
    createdAtLte,
    shopName,
    shopDescription,
    offset = 0,
    limit = 20,
    page = 1,
  } = props.body;
  const safeLimit = Math.min(Math.max(limit ?? 20, 1), 100);
  const safeOffset = Math.max(offset ?? 0, 0);
  const safePage = page === null ? 1 : Math.max(page, 1);
  const calculatedOffset = safeOffset + (safePage - 1) * safeLimit;
  const whereFilter: Prisma.shopping_mall_seller_profile_snapshotsWhereInput = {
    ...(sellerId && { shopping_mall_seller_id: sellerId }),
    ...(createdAtGte && { created_at: { gte: createdAtGte } }),
    ...(createdAtLte && { created_at: { lte: createdAtLte } }),
    ...(shopName && { shop_name: { contains: shopName, mode: "insensitive" } }),
    ...(shopDescription && {
      shop_description: { contains: shopDescription, mode: "insensitive" },
    }),
  };
  const totalRecords =
    await MyGlobal.prisma.shopping_mall_seller_profile_snapshots.count({
      where: whereFilter,
    });
  const records =
    await MyGlobal.prisma.shopping_mall_seller_profile_snapshots.findMany({
      where: whereFilter,
      skip: calculatedOffset,
      take: safeLimit,
      orderBy: { created_at: "desc" },
      include: {
        seller: {
          select: {
            id: true,
            email: true,
            shop_name: true,
            shop_description: true,
            logo_uri: true,
            approval_status: true,
            rejection_reason: true,
          },
        },
      },
    });
  const data = records.map((rec) => ({
    id: rec.id as string & tags.Format<"uuid">,
    shopName: rec.shop_name,
    shopDescription: rec.shop_description ?? "",
    logoImageUrl: rec.logo_image_url ?? null,
    createdAt: rec.created_at.toISOString() as string &
      tags.Format<"date-time">,
    seller: {
      id: rec.seller.id as string & tags.Format<"uuid">,
      email: rec.seller.email,
      shopName: rec.seller.shop_name,
      shopDescription: rec.seller.shop_description ?? "",
      logoUri: rec.seller.logo_uri ?? null,
      approvalStatus: rec.seller.approval_status,
      rejectionReason: rec.seller.rejection_reason ?? null,
    },
  }));
  const totalPages = Math.ceil(totalRecords / safeLimit);
  return {
    pagination: {
      current: safePage,
      limit: safeLimit,
      records: totalRecords,
      pages: totalPages,
    },
    data,
  };
}
