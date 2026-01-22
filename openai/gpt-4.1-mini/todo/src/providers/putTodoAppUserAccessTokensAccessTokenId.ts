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
import { ITodoAppAccessToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAccessToken";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function putTodoAppUserAccessTokensAccessTokenId(props: {
  user: UserPayload;
  accessTokenId: string & tags.Format<"uuid">;
  body: ITodoAppAccessToken.IUpdate;
}): Promise<ITodoAppAccessToken> {
  // Verify token ownership
  const existing = await MyGlobal.prisma.todo_app_access_tokens.findUnique({
    where: { id: props.accessTokenId },
    select: { todo_app_user_id: true },
  });
  if (!existing) {
    throw new HttpException("Access token not found", 404);
  }
  if (existing.todo_app_user_id !== props.user.id) {
    throw new HttpException(
      "Forbidden: Access token does not belong to user",
      403,
    );
  }
  // Update the access token
  const updated = await MyGlobal.prisma.todo_app_access_tokens.update({
    where: { id: props.accessTokenId },
    data: {
      token: props.body.token,
      expired_at: props.body.expired_at
        ? toISOStringSafe(props.body.expired_at)
        : undefined,
      revoked_at: props.body.revoked_at
        ? toISOStringSafe(props.body.revoked_at)
        : undefined,
      updated_at: props.body.updated_at
        ? toISOStringSafe(props.body.updated_at)
        : undefined,
    },
    select: {
      expired_at: true,
      token: true,
      type: true,
      issued_at: true,
      revoked_at: true,
      todo_app_user_id: true,
      todo_app_guest_id: true,
      todo_app_user_session_id: true,
    },
  });
  // Convert updated.type string to boolean
  const typeAsBoolean = ["true", "1", "yes", "True"].includes(updated.type);
  return {
    expired_at:
      updated.expired_at === null || updated.expired_at === undefined
        ? null
        : (updated.expired_at satisfies string as string &
            tags.Format<"date-time">),
    token: updated.token,
    type: typeAsBoolean,
    issued_at:
      updated.issued_at === null || updated.issued_at === undefined
        ? null
        : toISOStringSafe(updated.issued_at),
    revoked_at:
      updated.revoked_at === null || updated.revoked_at === undefined
        ? null
        : toISOStringSafe(updated.revoked_at),
    todo_app_user_id: updated.todo_app_user_id ?? null,
    todo_app_guest_id: updated.todo_app_guest_id ?? null,
    todo_app_user_session_id: updated.todo_app_user_session_id ?? null,
  };
}
