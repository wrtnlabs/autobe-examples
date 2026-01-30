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

export async function postEconomicForumUserAuthUsersEmailVerifyResend(props: {
  user: UserPayload;
}): Promise<void> {
  const user = await MyGlobal.prisma.economic_forum_users.findUnique({
    where: { id: props.user.id },
  });
  if (!user) {
    throw new HttpException("Unauthorized", 401);
  }
  const verificationCode = v4() as string & tags.Format<"uuid">;
  const expiresAt = toISOStringSafe(new Date(Date.now() + 24 * 60 * 60 * 1000));
  await MyGlobal.prisma.economic_forum_user_email_verifications.create({
    data: {
      id: verificationCode,
      user: { connect: { id: props.user.id } },
      expired_at: expiresAt,
      created_at: toISOStringSafe(new Date()),
      token: v4() as string & tags.Format<"uuid">,
    },
  });
  // Trigger email delivery (handled internally by system)
  return;
}
