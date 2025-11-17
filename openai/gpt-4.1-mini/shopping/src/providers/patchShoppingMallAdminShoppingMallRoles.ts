import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRole";
import { IPageIShoppingMallRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRole";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminShoppingMallRoles(props: {
  admin: AdminPayload;
  body: IShoppingMallRole.IRequest;
}): Promise<IPageIShoppingMallRole.ISummary> {
  const page = props.body.page > 0 ? props.body.page : 1;
  const limit = props.body.limit > 0 ? props.body.limit : 20;
  const skip = (page - 1) * limit;

  const searchTerm = props.body.searchTerm?.trim();

  const where = (
    searchTerm
      ? {
          OR: [
            { name: { contains: searchTerm, mode: "insensitive" as const } },
            { label: { contains: searchTerm, mode: "insensitive" as const } },
          ],
        }
      : {}
  ) satisfies Prisma.shopping_mall_rolesWhereInput;

  const orderBy = (
    props.body.sortField && props.body.sortDirection
      ? { [props.body.sortField]: props.body.sortDirection as "asc" | "desc" }
      : { created_at: "desc" as const }
  ) satisfies Prisma.shopping_mall_rolesOrderByWithRelationInput;

  const [roles, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_roles.findMany({
      where,
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.shopping_mall_roles.count({ where }),
  ]);

  return {
    data: roles.map((role) => ({
      id: role.id,
      name: role.name,
      label: role.label,
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
