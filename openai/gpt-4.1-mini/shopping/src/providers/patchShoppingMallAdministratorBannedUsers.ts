import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallBannedUser";
import { IShoppingMallBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBannedUser";
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
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    deleted_at: null as null,
  } satisfies Prisma.shopping_mall_banned_usersWhereInput;
  const records = await MyGlobal.prisma.shopping_mall_banned_users.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      shopping_mall_customer_id: true,
      shopping_mall_seller_id: true,
      ban_reason: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      customer: {
        select: { id: true },
      },
      seller: {
        select: { id: true },
      },
    },
  });
  const total = await MyGlobal.prisma.shopping_mall_banned_users.count({
    where: whereInput,
  });
  const data = records.map((record) => {
    const customer = record.customer ? { id: record.customer.id } : undefined;
    const seller = record.seller ? { id: record.seller.id } : undefined;
    return {
      id: record.id,
      shopping_mall_customer_id: record.shopping_mall_customer_id ?? undefined,
      shopping_mall_seller_id: record.shopping_mall_seller_id ?? undefined,
      ban_reason: record.ban_reason,
      created_at: toISOStringSafe(record.created_at),
      updated_at: toISOStringSafe(record.updated_at),
      deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
      customer,
      seller,
    };
  });
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
