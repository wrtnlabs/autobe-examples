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
import { ITodoAppRefreshToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppRefreshToken";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { ITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserSession";
import { ITodoAppAccessToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAccessToken";
import { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import { UserPayload } from "../decorators/payload/UserPayload";
import { TodoAppRefreshTokenCollector } from "../collectors/TodoAppRefreshTokenCollector";
import { TodoAppRefreshTokenTransformer } from "../transformers/TodoAppRefreshTokenTransformer";

export async function postTodoAppUserRefreshTokens(props: {
  user: UserPayload;
  body: ITodoAppRefreshToken.ICreate;
}): Promise<ITodoAppRefreshToken> {
  const data = await TodoAppRefreshTokenCollector.collect({
    body: props.body,
    user: { id: props.user.id },
    userSession: { id: props.user.session_id },
  });
  const created = await MyGlobal.prisma.todo_app_refresh_tokens.create({
    data,
    ...TodoAppRefreshTokenTransformer.select(),
  });
  return await TodoAppRefreshTokenTransformer.transform(created);
}
