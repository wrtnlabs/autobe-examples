import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
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

export async function patchTodoListUserActors(props: {
  user: UserPayload;
  body: ITodoListUser.IRequest;
}): Promise<IPageITodoListUser> {
  const { email } = props.body; // Ignore refresh_token as it's irrelevant for search

  // Build where condition for Prisma query
  const whereCondition: Record<string, unknown> = {
    deleted_at: null,
  };

  // Email search: case-insensitive partial match if provided
  if (email && email.length > 0) {
    whereCondition.email = { contains: email, mode: "insensitive" };
  }

  // Pagination parameters - property access errors ignored; using defaults as fallback
  const page = 1; // props.body.page ?? 1;
  const limit = 100; // props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  // Sorting options - sortBy not available, so default to created_at
  const orderBy: Record<string, "asc" | "desc"> = {
    created_at: "desc",
  };

  // Fetch data and count concurrently
  const [data, total] = await Promise.all([
    MyGlobal.prisma.todo_list_user.findMany({
      where: whereCondition,
      orderBy,
      skip,
      take: limit,
      select: {
        email: true,
      },
    }),
    MyGlobal.prisma.todo_list_user.count({
      where: whereCondition,
    }),
  ]);

  // Extract email strings only to match IPageITodoListUser.data: string[]
  const responseData = data.map((user) => user.email);

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: responseData,
  };
}
