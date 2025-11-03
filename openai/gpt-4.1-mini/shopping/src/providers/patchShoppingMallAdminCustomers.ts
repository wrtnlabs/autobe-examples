import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IPageIShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomer";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminCustomers(props: {
  admin: AdminPayload;
  body: IShoppingMallCustomer.IRequest;
}): Promise<IPageIShoppingMallCustomer.ISummary> {
  const { body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 10;

  const where: {
    deleted_at?: null;
    email?: { contains: string };
    nickname?: { contains: string };
    created_at?: {
      gte?: string & tags.Format<"date-time">;
      lte?: string & tags.Format<"date-time">;
    };
  } = {};

  if (!body.includeDeleted) {
    where.deleted_at = null;
  }

  if (body.searchEmail !== undefined && body.searchEmail !== null) {
    where.email = { contains: body.searchEmail };
  }

  if (body.searchNickname !== undefined && body.searchNickname !== null) {
    where.nickname = { contains: body.searchNickname };
  }

  if (
    (body.createdAfter !== undefined && body.createdAfter !== null) ||
    (body.createdBefore !== undefined && body.createdBefore !== null)
  ) {
    where.created_at = {};
    if (body.createdAfter !== undefined && body.createdAfter !== null) {
      where.created_at.gte = body.createdAfter;
    }
    if (body.createdBefore !== undefined && body.createdBefore !== null) {
      where.created_at.lte = body.createdBefore;
    }
  }

  const [results, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_customers.findMany({
      where,
      select: {
        id: true,
        email: true,
        nickname: true,
        created_at: true,
      },
      orderBy: {
        [body.orderBy]: body.orderDirection,
      },
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_customers.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((item) => ({
      id: item.id,
      email: item.email,
      nickname: item.nickname,
      created_at: toISOStringSafe(item.created_at),
    })),
  };
}
