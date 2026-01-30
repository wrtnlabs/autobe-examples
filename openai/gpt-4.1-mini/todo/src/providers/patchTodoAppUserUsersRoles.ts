import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppUserRole } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserRole";
import { IPageITodoAppUserRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppUserRole";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { ITodoAppRole } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppRole";
import { UserPayload } from "../decorators/payload/UserPayload";
import { TodoAppUserRoleAtSummaryTransformer } from "../transformers/TodoAppUserRoleAtSummaryTransformer";

export async function patchTodoAppUserUsersRoles(props: {
  user: UserPayload;
  body: ITodoAppUserRole.IRequest;
}): Promise<IPageITodoAppUserRole.ISummary> {
  const {
    search,
    role_id,
    user_id,
    page = 1,
    limit = 10,
    sort_by = "created_at",
    sort_order = "asc",
  } = props.body;
  const whereInput: Prisma.todo_app_user_rolesWhereInput = {
    AND: [
      search
        ? {
            OR: [
              { role: { name: { contains: search, mode: "insensitive" } } },
              { user: { id: { equals: user_id ?? undefined } } },
            ],
          }
        : {},
      role_id ? { role: { id: role_id } } : {},
      user_id ? { user: { id: user_id } } : {},
    ],
  };
  const orderByInput =
    sort_by === "role_name"
      ? { role: { name: sort_order } }
      : { created_at: sort_order };
  const skip = (page - 1) * limit;
  const data = await MyGlobal.prisma.todo_app_user_roles.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    ...TodoAppUserRoleAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.todo_app_user_roles.count({
    where: whereInput,
  });
  return {
    data: await Promise.all(
      data.map(TodoAppUserRoleAtSummaryTransformer.transform),
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
