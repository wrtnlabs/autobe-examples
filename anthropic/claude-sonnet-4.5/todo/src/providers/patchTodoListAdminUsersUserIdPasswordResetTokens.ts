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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchTodoListAdminUsersUserIdPasswordResetTokens(props: {
  admin: AdminPayload;
  userId: string & tags.Format<"uuid">;
  body: ITodoListPasswordResetToken.IRequest;
}): Promise<IPageITodoListPasswordResetToken.ISummary> {
  // Pagination defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 30;
  const skip = (page - 1) * limit;

  // Filter construction
  const where: Record<string, unknown> = {
    todo_list_user_id: props.userId,
  };
  // Expiration filter
  if (props.body.expired !== undefined) {
    const now = new Date();
    if (props.body.expired === true) {
      where["expires_at"] = { lt: toISOStringSafe(now) };
    } else {
      where["expires_at"] = { gte: toISOStringSafe(now) };
    }
  }
  // Used filter
  if (props.body.used !== undefined) {
    if (props.body.used === true) {
      where["used_at"] = { not: null };
    } else {
      where["used_at"] = null;
    }
  }
  // Creation date window
  if (
    props.body.created_from !== undefined ||
    props.body.created_until !== undefined
  ) {
    where["created_at"] = {};
    if (props.body.created_from !== undefined) {
      (where["created_at"] as Record<string, string>)["gte"] =
        props.body.created_from;
    }
    if (props.body.created_until !== undefined) {
      (where["created_at"] as Record<string, string>)["lte"] =
        props.body.created_until;
    }
    // Remove if empty
    if (Object.keys(where["created_at"] as object).length === 0) {
      delete where["created_at"];
    }
  }
  // Expiration date window
  if (
    props.body.expires_from !== undefined ||
    props.body.expires_until !== undefined
  ) {
    where["expires_at"] = where["expires_at"] || {};
    if (props.body.expires_from !== undefined) {
      (where["expires_at"] as Record<string, string>)["gte"] =
        props.body.expires_from;
    }
    if (props.body.expires_until !== undefined) {
      (where["expires_at"] as Record<string, string>)["lte"] =
        props.body.expires_until;
    }
    // Remove if empty
    if (Object.keys(where["expires_at"] as object).length === 0) {
      delete where["expires_at"];
    }
  }

  // Sorting
  const sortField = props.body.sort_by ?? "created_at";
  const sortDir = props.body.sort_dir ?? "desc";
  const orderBy = { [sortField]: sortDir };

  // Query Prisma: list and total count
  const [tokens, total] = await Promise.all([
    MyGlobal.prisma.todo_list_password_reset_tokens.findMany({
      where,
      include: {
        user: true,
      },
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.todo_list_password_reset_tokens.count({ where }),
  ]);

  return {
    data: tokens.map((token) => ({
      id: token.id,
      token: token.token,
      user: {
        id: token.user.id,
        email: token.user.email,
        created_at: toISOStringSafe(token.user.created_at),
        updated_at: toISOStringSafe(token.user.updated_at),
        disabled_at:
          token.user.disabled_at !== null
            ? toISOStringSafe(token.user.disabled_at)
            : undefined,
      },
      created_at: toISOStringSafe(token.created_at),
      expires_at: toISOStringSafe(token.expires_at),
      used_at:
        token.used_at !== null ? toISOStringSafe(token.used_at) : undefined,
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / (limit || 1)),
    },
  };
}
