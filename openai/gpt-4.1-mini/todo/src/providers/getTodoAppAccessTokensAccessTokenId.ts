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

export async function getTodoAppAccessTokensAccessTokenId(props: {
  accessTokenId: string & tags.Format<"uuid">;
}): Promise<ITodoAppAccessToken> {
  const record = await MyGlobal.prisma.todo_app_access_tokens.findUnique({
    where: { id: props.accessTokenId },
  });
  if (!record) {
    throw new HttpException("Access token not found", 404);
  }
  return {
    id: record.id satisfies string & tags.Format<"uuid"> as string &
      tags.Format<"uuid">,
    expired_at: toISOStringSafe(record.expired_at),
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    todo_app_user_id:
      record.todo_app_user_id === null
        ? null
        : (record.todo_app_user_id satisfies string | null as string | null),
    todo_app_guest_id:
      record.todo_app_guest_id === null
        ? null
        : (record.todo_app_guest_id satisfies string | null as string | null),
    todo_app_user_session_id:
      record.todo_app_user_session_id === null
        ? null
        : (record.todo_app_user_session_id satisfies string | null as
            | string
            | null),
    token: record.token === null ? null : record.token,
    type: record.type === null ? null : record.type,
    issued_at: record.issued_at === null ? null : record.issued_at,
    revoked_at: record.revoked_at === null ? null : record.revoked_at,
  } satisfies ITodoAppAccessToken;
}
