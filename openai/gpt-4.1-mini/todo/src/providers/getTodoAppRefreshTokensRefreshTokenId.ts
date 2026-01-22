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
import { TodoAppRefreshTokenTransformer } from "../transformers/TodoAppRefreshTokenTransformer";

export async function getTodoAppRefreshTokensRefreshTokenId(props: {
  refreshTokenId: string & tags.Format<"uuid">;
}): Promise<ITodoAppRefreshToken> {
  const record =
    await MyGlobal.prisma.todo_app_refresh_tokens.findUniqueOrThrow({
      where: { id: props.refreshTokenId },
      ...TodoAppRefreshTokenTransformer.select(),
    });
  return await TodoAppRefreshTokenTransformer.transform(record);
}
