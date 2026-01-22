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
import { TodoAppRefreshTokenTransformer } from "../transformers/TodoAppRefreshTokenTransformer";

export async function patchTodoAppUserRefreshTokens(props: {
  user: UserPayload;
  body: ITodoAppRefreshToken.IRequest;
}): Promise<ITodoAppRefreshToken> {
  const existing = await MyGlobal.prisma.todo_app_refresh_tokens.findUnique({
    where: {
      id: props.body.id,
    },
  });
  if (!existing) {
    throw new HttpException("Refresh token not found", 404);
  }
  if (existing.user_id !== props.user.id) {
    throw new HttpException(
      "Forbidden: This token does not belong to the user",
      403,
    );
  }
  const expiredAt =
    props.body.expired_at === null || props.body.expired_at === undefined
      ? undefined
      : toISOStringSafe(props.body.expired_at);
  const createdAt =
    props.body.created_at === null || props.body.created_at === undefined
      ? undefined
      : (toISOStringSafe(props.body.created_at) ?? existing.created_at);
  const updated = await MyGlobal.prisma.todo_app_refresh_tokens.update({
    where: { id: props.body.id },
    data: {
      refresh_token: props.body.refresh_token,
      expired_at: expiredAt,
      created_at: createdAt,
    },
  });
  return await TodoAppRefreshTokenTransformer.transform(updated);
}
