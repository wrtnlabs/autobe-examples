import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditPlatformUserPasswordResetsResetId(props: {
  user: UserPayload;
  resetId: string;
}): Promise<void> {
  const record =
    await MyGlobal.prisma.reddit_platform_user_password_resets.findUnique({
      where: { id: props.resetId },
    });
  if (!record) {
    throw new HttpException("Password reset not found", 404);
  }
  return;
}
