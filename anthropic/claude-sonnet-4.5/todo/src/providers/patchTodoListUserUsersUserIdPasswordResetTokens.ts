import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListPasswordResetToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListPasswordResetToken";
import { IPageITodoListPasswordResetToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListPasswordResetToken";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchTodoListUserUsersUserIdPasswordResetTokens(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  body: ITodoListPasswordResetToken.IRequest;
}): Promise<IPageITodoListPasswordResetToken.ISummary> {
  // Only the owner can access, userId must match authenticated user
  if (props.userId !== props.user.id) {
    throw new HttpException(
      "Forbidden: can only list your own password reset tokens.",
      403,
    );
  }

  const {
    expired,
    used,
    created_from,
    created_until,
    expires_from,
    expires_until,
    sort_by,
    sort_dir,
    page,
    limit,
  } = props.body;

  // Determine paging
  const take = typeof limit === "number" ? limit : 100;
  const current = typeof page === "number" ? page : 1;
  const skip = (current - 1) * take;

  // Determine default sort
  const allowedSortFields = ["created_at", "expires_at", "used_at"] as const;
  const sortField: (typeof allowedSortFields)[number] =
    allowedSortFields.includes(sort_by as (typeof allowedSortFields)[number]) &&
    sort_by
      ? (sort_by as (typeof allowedSortFields)[number])
      : "created_at";
  const sortOrder = sort_dir === "asc" ? "asc" : "desc";

  // Calculate current UTC time for expiration comparison (as ISO string)
  const now = toISOStringSafe(new Date());

  // Build complex where clause
  const where = {
    todo_list_user_id: props.userId,
    ...(expired !== undefined
      ? expired === true
        ? { expires_at: { lt: now } }
        : { expires_at: { gte: now } }
      : {}),
    ...(used !== undefined
      ? used === true
        ? { used_at: { not: null } }
        : { used_at: null }
      : {}),
    ...(created_from !== undefined
      ? { created_at: { gte: created_from } }
      : {}),
    ...(created_until !== undefined
      ? {
          created_at: Object.assign(
            {},
            created_from !== undefined ? { gte: created_from } : {},
            { lte: created_until },
          ),
        }
      : {}),
    ...(expires_from !== undefined
      ? { expires_at: { gte: expires_from } }
      : {}),
    ...(expires_until !== undefined
      ? {
          expires_at: Object.assign(
            {},
            expires_from !== undefined ? { gte: expires_from } : {},
            { lte: expires_until },
          ),
        }
      : {}),
  };

  // Query and count in parallel
  const [tokens, total] = await Promise.all([
    MyGlobal.prisma.todo_list_password_reset_tokens.findMany({
      where,
      skip,
      take,
      orderBy: { [sortField]: sortOrder },
      include: {
        user: true, // join with user
      },
    }),
    MyGlobal.prisma.todo_list_password_reset_tokens.count({ where }),
  ]);

  return {
    pagination: {
      current,
      limit: take,
      records: total,
      pages: Math.ceil(total / take),
    },
    data: tokens.map((token) => ({
      id: token.id,
      token: token.token,
      user: {
        id: token.user.id,
        email: token.user.email,
        created_at: toISOStringSafe(token.user.created_at),
        updated_at: toISOStringSafe(token.user.updated_at),
        disabled_at:
          token.user.disabled_at === null
            ? undefined
            : toISOStringSafe(token.user.disabled_at),
      },
      created_at: toISOStringSafe(token.created_at),
      expires_at: toISOStringSafe(token.expires_at),
      used_at:
        token.used_at === null ? undefined : toISOStringSafe(token.used_at),
    })),
  };
}
