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
import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteTodoAppUserRefreshTokensRefreshTokenId(props: {
  user: UserPayload;
  refreshTokenId: string & tags.Format<"uuid">;
}): Promise<void> {
  const deleted = await MyGlobal.prisma.todo_app_refresh_tokens.deleteMany({
    where: {
      id: props.refreshTokenId,
      user_id: props.user.id,
    },
  });
  if (deleted.count === 0) {
    throw new HttpException(
      "Refresh token not found or not owned by user",
      404,
    );
  }
}
