import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallUserRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserRole";
import { IPageIShoppingMallUserRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallUserRole";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminUserRoles(props: {
  admin: AdminPayload;
  body: IShoppingMallUserRole.IRequest;
}): Promise<IPageIShoppingMallUserRole.ISummary> {
  const { body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 30;
  const skip = (page - 1) * limit;

  const where: Prisma.shopping_mall_user_rolesWhereInput = {};

  if (body.role_name !== undefined) {
    where.role_name = body.role_name;
  }

  if (body.user_id !== undefined) {
    where.user_id = body.user_id;
  }

  const [results, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_user_roles.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_user_roles.count({ where }),
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
      user_id: item.user_id,
      role_name: item.role_name,
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
    })),
  };
}
