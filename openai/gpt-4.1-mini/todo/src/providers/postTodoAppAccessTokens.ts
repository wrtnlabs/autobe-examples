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
import { TodoAppAccessTokenCollector } from "../collectors/TodoAppAccessTokenCollector";

export async function postTodoAppAccessTokens(props: {
  body: ITodoAppAccessToken.ICreate;
}): Promise<ITodoAppAccessToken> {
  const data = await TodoAppAccessTokenCollector.collect({ body: props.body });
  const created = await MyGlobal.prisma.todo_app_access_tokens.create({ data });
  return {
    access: created.token,
    refresh: "",
    expired_at: toISOStringSafe(created.expired_at),
    refreshable_until: toISOStringSafe(created.expired_at),
    token: created.token ? true : false,
    type: created.type ? true : false,
    issued_at: created.issued_at ? true : false,
    revoked_at: created.revoked_at ? true : null,
    todo_app_user_id: created.todo_app_user_id ? true : null,
    todo_app_guest_id: created.todo_app_guest_id ? true : null,
    todo_app_user_session_id: created.todo_app_user_session_id ? true : null,
  };
}
