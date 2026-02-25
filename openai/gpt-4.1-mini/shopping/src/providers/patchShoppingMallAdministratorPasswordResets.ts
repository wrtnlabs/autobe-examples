import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallSellerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerPasswordReset";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPasswordReset";
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

export async function patchShoppingMallAdministratorPasswordResets(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallSellerPasswordReset.IRequest;
}): Promise<IPageIShoppingMallSellerPasswordReset.ISummary> {
  const {
    sellerId,
    token,
    createdAtFrom,
    createdAtTo,
    expiredAtFrom,
    expiredAtTo,
    usedAtFrom,
    usedAtTo,
    deleted,
    page,
    limit,
    sort,
    search,
  } = props.body;
  const currentPage = page >= 1 ? page : 1;
  const pageSize = limit >= 1 && limit <= 100 ? limit : 100;
  const where: Prisma.shopping_mall_seller_password_resetsWhereInput = {
    ...(sellerId ? { seller_id: sellerId } : {}),
    ...(token ? { token: { contains: token } } : {}),
    ...(createdAtFrom ? { created_at: { gte: new Date(createdAtFrom) } } : {}),
    ...(createdAtTo ? { created_at: { lte: new Date(createdAtTo) } } : {}),
    ...(expiredAtFrom ? { expired_at: { gte: new Date(expiredAtFrom) } } : {}),
    ...(expiredAtTo ? { expired_at: { lte: new Date(expiredAtTo) } } : {}),
    ...(usedAtFrom ? { used_at: { gte: new Date(usedAtFrom) } } : {}),
    ...(usedAtTo ? { used_at: { lte: new Date(usedAtTo) } } : {}),
    ...(deleted === true
      ? { NOT: { deleted_at: null } }
      : deleted === false
        ? { deleted_at: null }
        : {}),
  };
  let orderBy: Prisma.shopping_mall_seller_password_resetsOrderByWithRelationInput =
    { created_at: "desc" };
  if (sort) {
    const [field, directionRaw] = sort.split(" ");
    const direction = directionRaw?.toLowerCase() === "asc" ? "asc" : "desc";
    const sortableFields = new Map<
      string,
      keyof Prisma.shopping_mall_seller_password_resetsOrderByWithRelationInput
    >([
      ["createdAt", "created_at"],
      ["expiredAt", "expired_at"],
      ["usedAt", "used_at"],
      ["token", "token"],
    ]);
    const dbField = sortableFields.get(field) ?? "created_at";
    orderBy = { [dbField]: direction };
  }
  const data =
    await MyGlobal.prisma.shopping_mall_seller_password_resets.findMany({
      where,
      orderBy,
      skip: (currentPage - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        token: true,
        created_at: true,
        expired_at: true,
        used_at: true,
        deleted_at: true,
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
  const total =
    await MyGlobal.prisma.shopping_mall_seller_password_resets.count({ where });
  function convertDate(date: Date | null): string | null {
    if (date === null) return null;
    return toISOStringSafe(date) as string & tags.Format<"date-time">;
  }
  const transformedData = data.map((record) => ({
    id: record.id as string & tags.Format<"uuid">,
    token: record.token,
    createdAt: toISOStringSafe(record.created_at),
    expiredAt: toISOStringSafe(record.expired_at),
    usedAt: convertDate(record.used_at),
    deletedAt: convertDate(record.deleted_at),
    seller: {
      id: record.seller.id as string & tags.Format<"uuid">,
      email: record.seller.email,
      shopName: record.seller.shop_name,
      shopDescription: record.seller.shop_description ?? undefined,
      logoUri: record.seller.logo_uri ?? undefined,
      approvalStatus: record.seller.approval_status,
      rejectionReason: record.seller.rejection_reason ?? undefined,
    } satisfies IShoppingMallSeller.ISummary,
  }));
  return {
    pagination: {
      current: currentPage,
      limit: pageSize,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / pageSize),
    },
    data: transformedData,
  } satisfies IPageIShoppingMallSellerPasswordReset.ISummary;
}
