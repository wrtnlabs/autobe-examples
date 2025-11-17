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

export async function patchShoppingMallAdminShoppingMallUserRoles(props: {
  admin: AdminPayload;
  body: IShoppingMallUserRole.IRequest;
}): Promise<IPageIShoppingMallUserRole.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const skip = (page - 1) * limit;

  // Build where condition for filters
  const whereCondition: Prisma.shopping_mall_user_rolesWhereInput = {
    AND: [
      {
        deleted_at: null, // only non-deleted records by default
      },
      ...(props.body.shopping_mall_admin_id
        ? [{ shopping_mall_admin_id: props.body.shopping_mall_admin_id }]
        : []),
      ...(props.body.shopping_mall_role_id
        ? [{ shopping_mall_role_id: props.body.shopping_mall_role_id }]
        : []),
      ...(props.body.created_at_start || props.body.created_at_end
        ? [
            {
              created_at: {
                ...(props.body.created_at_start && {
                  gte: props.body.created_at_start,
                }),
                ...(props.body.created_at_end && {
                  lte: props.body.created_at_end,
                }),
              },
            },
          ]
        : []),
      ...(props.body.deleted_at_start || props.body.deleted_at_end
        ? [
            {
              deleted_at: {
                ...(props.body.deleted_at_start && {
                  gte: props.body.deleted_at_start,
                }),
                ...(props.body.deleted_at_end && {
                  lte: props.body.deleted_at_end,
                }),
              },
            },
          ]
        : []),
    ],
  };

  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_user_roles.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        shopping_mall_admin_id: true,
        shopping_mall_role_id: true,
        created_at: true,
        deleted_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_user_roles.count({ where: whereCondition }),
  ]);

  return {
    data: data.map((item) => ({
      id: item.id as string & tags.Format<"uuid">,
      shopping_mall_admin_id: item.shopping_mall_admin_id as string &
        tags.Format<"uuid">,
      shopping_mall_role_id: item.shopping_mall_role_id as string &
        tags.Format<"uuid">,
      created_at: toISOStringSafe(item.created_at) as string &
        tags.Format<"date-time">,
      deleted_at: item.deleted_at ? toISOStringSafe(item.deleted_at) : null,
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
