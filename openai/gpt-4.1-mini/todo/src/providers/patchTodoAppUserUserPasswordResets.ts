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
import { ITodoAppUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserPasswordReset";
import { IPageITodoAppUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppUserPasswordReset";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchTodoAppUserUserPasswordResets(props: {
  user: UserPayload;
  body: ITodoAppUserPasswordReset.IRequest;
}): Promise<IPageITodoAppUserPasswordReset.ISummary> {
  const {
    token,
    user_id,
    created_before,
    created_after,
    expired,
    page = 1,
    page_size = 20,
    sort_order = "desc",
    sort_by = "created_at",
  } = props.body;
  // Use current ISO string for 'now' for expired filter
  const now: string & tags.Format<"date-time"> = new Date().toISOString();
  const where = {
    ...(token ? { token: { contains: token } } : {}),
    ...(user_id ? { user_id } : {}),
    ...(created_before ? { created_at: { lte: created_before } } : {}),
    ...(created_after ? { created_at: { gte: created_after } } : {}),
    ...(expired !== undefined && expired !== null
      ? expired
        ? { expires_at: { lte: now } }
        : { expires_at: { gt: now } }
      : {}),
  } satisfies Prisma.todo_app_user_password_resetsWhereInput;
  const orderBy = {
    [sort_by]: sort_order,
  } satisfies Prisma.todo_app_user_password_resetsOrderByWithRelationInput;
  const skip = (page - 1) * page_size;
  const take = page_size;
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.todo_app_user_password_resets.findMany({
      where,
      orderBy,
      skip,
      take,
      select: {
        id: true,
        token: true,
        requested_at: true,
        expires_at: true,
        created_at: true,
        updated_at: true,
        todoAppUser: {
          select: {
            id: true,
            email: true,
            username: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
      },
    }),
    MyGlobal.prisma.todo_app_user_password_resets.count({ where }),
  ]);
  // Helper conversion for nullable date-time fields
  function convertDateTime(
    value: Date | null,
  ): (string & tags.Format<"date-time">) | null {
    return value === null || value === undefined
      ? null
      : (value.toISOString() as string & tags.Format<"date-time">);
  }
  // Map to API ISummary DTO with correct null and date-time handling
  return {
    data: rows.map((row) => ({
      id: row.id,
      token: row.token,
      requested_at: convertDateTime(row.requested_at),
      expires_at: row.expires_at.toISOString() as string &
        tags.Format<"date-time">,
      created_at: row.created_at.toISOString() as string &
        tags.Format<"date-time">,
      updated_at: convertDateTime(row.updated_at),
      todoAppUser: {
        id: row.todoAppUser.id,
        email: row.todoAppUser.email,
        username: row.todoAppUser.username,
        created_at: row.todoAppUser.created_at.toISOString() as string &
          tags.Format<"date-time">,
        updated_at: convertDateTime(row.todoAppUser.updated_at),
        deleted_at: convertDateTime(row.todoAppUser.deleted_at),
      },
    })),
    pagination: {
      current: page,
      limit: page_size,
      records: total,
      pages: Math.ceil(total / page_size),
    } satisfies IPage.IPagination,
  };
}
