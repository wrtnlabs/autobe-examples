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

export async function deleteTodoAppUserAccessTokensAccessTokenId(props: {
  user: UserPayload;
  accessTokenId: string & tags.Format<"uuid">;
}): Promise<void> {
  const token = await MyGlobal.prisma.todo_app_access_tokens.findUnique({
    where: { id: props.accessTokenId },
  });
  if (!token) {
    throw new HttpException("Access token not found", 404);
  }
  if (token.todo_app_user_id !== props.user.id) {
    throw new HttpException(
      "Forbidden: token does not belong to the user",
      403,
    );
  }
  await MyGlobal.prisma.todo_app_access_tokens.delete({
    where: { id: props.accessTokenId },
  });
}
