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

export async function patchTodoAppUsers(props: {
  body: ITodoAppUser.IRequest;
}): Promise<IPageITodoAppUser.ISummary> {
  const whereConditions: Record<string, unknown> = {};

  // Email filter - partial match (case-insensitive)
  if (props.body.email) {
    whereConditions.email = { contains: props.body.email };
  }

  // Created before filter
  if (props.body.created_before) {
    whereConditions.created_at = { lte: props.body.created_before };
  }

  // Created after filter
  if (props.body.created_after) {
    if (!whereConditions.created_at) {
      whereConditions.created_at = {};
    }
    (whereConditions.created_at as any).gte = props.body.created_after;
  }

  // Deleted status filter
  if (props.body.deleted !== undefined) {
    whereConditions.deleted_at = props.body.deleted ? { not: null } : null;
  }

  // Get only the first user to match ISummary type
  const user = await MyGlobal.prisma.todo_app_users.findFirst({
    where: whereConditions,
    orderBy: { created_at: "desc" },
  });

  if (!user) {
    throw new HttpException("No users found", 404);
  }

  return {
    id: user.id,
  };
}
