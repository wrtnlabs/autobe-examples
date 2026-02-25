import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallBannedUser";
import { IShoppingMallBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBannedUser";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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

export async function patchShoppingMallAdministratorBannedUsers(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallBannedUser.IRequest;
}): Promise<IPageIShoppingMallBannedUser.ISummary> {
  const {
    shoppingMallCustomerId,
    shoppingMallSellerId,
    banReason,
    createdAfter,
    createdBefore,
    updatedAfter,
    updatedBefore,
    page = 1,
    limit = 20,
    sort = "createdAtDesc",
  } = props.body;
  const whereInput: Prisma.shopping_mall_banned_usersWhereInput = {
    deleted_at: null,
    customer: shoppingMallCustomerId
      ? { id: shoppingMallCustomerId }
      : undefined,
    seller: shoppingMallSellerId ? { id: shoppingMallSellerId } : undefined,
    ban_reason: banReason
      ? { contains: banReason, mode: "insensitive" }
      : undefined,
    created_at:
      createdAfter || createdBefore
        ? {
            ...(createdAfter ? { gte: createdAfter } : {}),
            ...(createdBefore ? { lte: createdBefore } : {}),
          }
        : undefined,
    updated_at:
      updatedAfter || updatedBefore
        ? {
            ...(updatedAfter ? { gte: updatedAfter } : {}),
            ...(updatedBefore ? { lte: updatedBefore } : {}),
          }
        : undefined,
  };
  const totalRecords = await MyGlobal.prisma.shopping_mall_banned_users.count({
    where: whereInput,
  });
  const orderByInput: Prisma.shopping_mall_banned_usersOrderByWithRelationInput =
    sort === "createdAtAsc"
      ? { created_at: "asc" }
      : sort === "createdAtDesc"
        ? { created_at: "desc" }
        : sort === "updatedAtAsc"
          ? { updated_at: "asc" }
          : { updated_at: "desc" };
  const dataRaw = await MyGlobal.prisma.shopping_mall_banned_users.findMany({
    where: whereInput,
    skip: (page - 1) * limit,
    take: limit,
    orderBy: orderByInput,
    select: {
      id: true,
      ban_reason: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      customer: {
        select: {
          id: true,
          email: true,
          display_name: true,
          phone_number: true,
          created_at: true,
          updated_at: true,
        },
      },
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
  const data = dataRaw.map((record) => ({
    id: record.id,
    banReason: record.ban_reason,
    createdAt: toISOStringSafe(record.created_at),
    updatedAt: toISOStringSafe(record.updated_at),
    deletedAt: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
    customer: record.customer
      ? {
          id: record.customer.id,
          email: record.customer.email,
          displayName: record.customer.display_name ?? null,
          phoneNumber: record.customer.phone_number ?? null,
          createdAt: toISOStringSafe(record.customer.created_at),
          updatedAt: toISOStringSafe(record.customer.updated_at),
        }
      : null,
    seller: record.seller
      ? {
          id: record.seller.id,
          email: record.seller.email,
          shopName: record.seller.shop_name,
          shopDescription: record.seller.shop_description ?? null,
          logoUri: record.seller.logo_uri ?? null,
          approvalStatus: record.seller.approval_status,
          rejectionReason: record.seller.rejection_reason ?? null,
        }
      : null,
  }));
  return {
    pagination: {
      current: page,
      limit,
      records: totalRecords,
      pages: Math.ceil(totalRecords / limit),
    },
    data,
  };
}
