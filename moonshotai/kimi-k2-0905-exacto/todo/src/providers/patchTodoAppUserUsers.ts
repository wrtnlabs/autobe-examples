import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { IPageITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppUser";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchTodoAppUserUsers(props: {
  user: UserPayload;
  body: ITodoAppUser.IRequest;
}): Promise<IPageITodoAppUser.ISummary> {
  // Parse pagination parameters with defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Build where conditions for search and filtering
  const whereConditions: Prisma.todo_app_usersWhereInput = {
    // Only return the authenticated user's own data
    id: props.user.id,
    deleted_at: null,
  };

  // Add search filter if provided (search email and name)
  if (props.body.search && props.body.search.trim().length > 0) {
    whereConditions.OR = [
      {
        email: {
          contains: props.body.search,
          mode: Prisma.QueryMode.insensitive,
        },
      },
      {
        name: {
          contains: props.body.search,
          mode: Prisma.QueryMode.insensitive,
        },
      },
    ];
  }

  // Add status filter if provided
  if (props.body.status) {
    whereConditions.status = props.body.status;
  }

  // Determine sort order
  const orderBy: Prisma.todo_app_usersOrderByWithRelationInput = {};
  const sortField = props.body.order_by || "created_at";
  const sortDirection = props.body.order_direction || "desc";

  if (sortField === "email") {
    orderBy.email = sortDirection as Prisma.SortOrder;
  } else {
    orderBy.created_at = sortDirection as Prisma.SortOrder;
  }

  // Execute paginated query
  const [users, total] = await Promise.all([
    MyGlobal.prisma.todo_app_users.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy,
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.todo_app_users.count({
      where: whereConditions,
    }),
  ]);

  // Build response with proper formatting
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: users.map((user) => ({
      id: user.id as string & tags.Format<"uuid">,
      email: user.email as string & tags.Format<"email">,
      name: user.name,
      status: user.status,
      created_at: toISOStringSafe(user.created_at),
    })),
  };
}
