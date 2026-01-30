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

export async function deleteEconomicForumUserAuthUsersPasswordResetsToken(props: {
  user: UserPayload;
  token: string;
}): Promise<void> {
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const existing =
    await MyGlobal.prisma.economic_forum_user_password_resets.findUnique({
      where: {
        token: props.token,
        user: { id: props.user.id },
        expired_at: { gt: now },
        deleted_at: null,
      },
    });
  if (!existing) {
    throw new HttpException("Token not found or has expired", 404);
  }
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.economic_forum_user_password_resets.delete({
      where: {
        token: props.token,
      },
    }),
    MyGlobal.prisma.economic_forum_system_audits.create({
      data: {
        id: v4(),
        user_id: props.user.id,
        actor_type: "user",
        action: "delete_password_reset_token",
        created_at: now,
        target_type: "password_reset_token",
        target_id: props.token,
        reason: "User manually deleted password reset token",
      },
    }),
  ]);
}
