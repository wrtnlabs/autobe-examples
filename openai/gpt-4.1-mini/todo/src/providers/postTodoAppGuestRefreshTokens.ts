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
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { TodoAppRefreshTokenCollector } from "../collectors/TodoAppRefreshTokenCollector";
import { TodoAppRefreshTokenTransformer } from "../transformers/TodoAppRefreshTokenTransformer";

export async function postTodoAppGuestRefreshTokens(props: {
  guest: GuestPayload;
  body: ITodoAppRefreshToken.ICreate;
}): Promise<ITodoAppRefreshToken> {
  const { guest, body } = props;
  // Use collector to prepare create input
  const createInput = await TodoAppRefreshTokenCollector.collect({
    body: {
      ...body,
      user_id: null,
      user_session_id: guest.session_id,
    },
    user: { id: guest.id },
    userSession: { id: guest.session_id },
  });
  // Create refresh token record
  const created = await MyGlobal.prisma.todo_app_refresh_tokens.create({
    data: createInput,
    ...TodoAppRefreshTokenTransformer.select(),
  });
  // Transform created record for response
  return await TodoAppRefreshTokenTransformer.transform(created);
}
