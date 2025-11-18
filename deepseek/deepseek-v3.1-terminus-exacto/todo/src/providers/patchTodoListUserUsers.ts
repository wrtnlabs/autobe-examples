import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import { IPageITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListUser";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchTodoListUserUsers(props: {
  user: UserPayload;
  body: ITodoListUser.IRequest;
}): Promise<IPageITodoListUser.ISummary> {
  // Extract pagination parameters with defaults
  const page = Math.max(1, props.body.page ?? 1);
  const limit = Math.min(100, Math.max(1, props.body.limit ?? 100));
  const skip = (page - 1) * limit;

  // Build WHERE conditions
  const where: Prisma.todo_list_usersWhereInput = {
    deleted_at: null,
  };

  // Add search condition if provided and non-empty
  if (props.body.search !== undefined && props.body.search.trim().length > 0) {
    where.email = {
      contains: props.body.search,
      mode: "insensitive",
    };
  }

  // Add status filter if provided and valid
  if (props.body.status !== undefined) {
    const validStatuses = ["active", "inactive", "suspended"];
    if (validStatuses.includes(props.body.status)) {
      where.status = props.body.status;
    }
  }

  // Build orderBy configuration
  const orderDirection = props.body.order === "desc" ? "desc" : "asc";
  const orderBy: Prisma.todo_list_usersOrderByWithRelationInput = {};

  switch (props.body.order_by) {
    case "created_at":
      orderBy.created_at = orderDirection;
      break;
    case "updated_at":
      orderBy.updated_at = orderDirection;
      break;
    case "email":
      orderBy.email = orderDirection;
      break;
    case "status":
      orderBy.status = orderDirection;
      break;
    default:
      // Default ordering by creation date descending
      orderBy.created_at = "desc";
      break;
  }

  // Execute concurrent queries for efficiency
  const [data, total] = await Promise.all([
    MyGlobal.prisma.todo_list_users.findMany({
      where,
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.todo_list_users.count({ where }),
  ]);

  // Transform database results to match ISummary interface
  const transformedData = data.map((user) => ({
    id: user.id as string & tags.Format<"uuid">,
    email: user.email as string & tags.Format<"email">,
    status: user.status,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    deleted_at: user.deleted_at ? toISOStringSafe(user.deleted_at) : undefined,
  }));

  // Calculate pagination metadata with proper typing
  const pages = Math.ceil(total / limit);

  return {
    pagination: {
      current: page as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: limit as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: pages as number & tags.Type<"int32"> & tags.Minimum<0>,
    },
    data: transformedData,
  };
}
