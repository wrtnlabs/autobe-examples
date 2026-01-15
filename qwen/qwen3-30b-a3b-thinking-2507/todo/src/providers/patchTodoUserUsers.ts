import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import { IPageITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoUser";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchTodoUserUsers(props: {
  user: UserPayload;
  body: ITodoUser.IRequest;
}): Promise<IPageITodoUser.ISummary> {
  const {
    page = 1,
    limit = 100,
    search,
    email_domain,
    status,
    min_last_activity,
    max_last_activity,
    sort_by,
    order = props.body.order || "desc",
  } = props.body;
  const offset = (page - 1) * limit;
  // Build where clause for Prisma
  const where = {
    deleted_at: null,
    ...(search && {
      OR: [{ email: { contains: search } }],
    }),
    ...(email_domain && {
      email: { endsWith: `@${email_domain}` },
      ...(status && { status }),
      ...(min_last_activity && {
        last_activity: { gte: min_last_activity },
        ...(max_last_activity && {
          last_activity: { lte: max_last_activity },
        }),
      }),
    }),
  };
  // Build orderBy based on sort_by parameter
  let orderBy: {
    [key: string]: "asc" | "desc";
  };
  if (sort_by === "last_login") {
    orderBy = { last_activity: order === "desc" ? "desc" : "asc" };
  } else if (sort_by === "username") {
    orderBy = { name: order === "desc" ? "desc" : "asc" };
  } else {
    orderBy = { created_at: order === "desc" ? "desc" : "asc" };
  }
  // Query for data with pagination
  const data = await MyGlobal.prisma.todo_users.findMany({
    where,
    skip: offset,
    take: limit,
    orderBy,
  });
  // Count total records
  const total = await MyGlobal.prisma.todo_users.count({
    where,
  });
  // Transform users to summary format
  const transformedData = data.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
  }));
  // Return paginated response
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
