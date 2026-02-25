import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RegistereduserPayload } from "../decorators/payload/RegistereduserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardRegisteredUserPasswordResetsPasswordResetId(props: {
  registeredUser: RegistereduserPayload;
  passwordResetId: string & tags.Format<"uuid">;
}): Promise<void> {
  await MyGlobal.prisma.$transaction(async (prisma) => {
    await prisma.discussion_board_registered_user_password_resets.findUniqueOrThrow(
      {
        where: { id: props.passwordResetId },
      },
    );
    await prisma.discussion_board_registered_user_password_resets.delete({
      where: { id: props.passwordResetId },
    });
    const now = new Date().toISOString() as string & tags.Format<"date-time">;
    await prisma.discussion_board_audit_logs.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        actor_id: props.registeredUser.id,
        event_type: "delete-password-reset",
        event_description: `Deleted password reset token ${props.passwordResetId} by registered user ${props.registeredUser.id}`,
        created_at: now,
        updated_at: now,
      },
    });
  });
}
