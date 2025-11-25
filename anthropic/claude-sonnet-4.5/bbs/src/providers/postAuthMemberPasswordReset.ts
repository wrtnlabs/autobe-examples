import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function postAuthMemberPasswordReset(props: {
  body: IDiscussionBoardMember.IRequestPasswordReset;
}): Promise<IDiscussionBoardMember.IPasswordResetRequested> {
  const resetTokenId = v4() as string & tags.Format<"uuid">;
  const token = v4() as string & tags.Format<"uuid">;
  const createdAt = toISOStringSafe(new Date());
  const expiresAt = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));

  const member = await MyGlobal.prisma.discussion_board_members.findFirst({
    where: {
      email: {
        equals: props.body.email,
        mode: "insensitive",
      },
      deleted_at: null,
    },
  });

  if (member) {
    await MyGlobal.prisma.$transaction(async (tx) => {
      await tx.discussion_board_password_resets.create({
        data: {
          id: resetTokenId,
          actor_type: "member",
          token: token,
          email: props.body.email,
          expires_at: expiresAt,
          used_at: null,
          created_at: createdAt,
        },
      });

      await tx.discussion_board_password_reset_of_members.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          discussion_board_password_reset_id: resetTokenId,
          discussion_board_member_id: member.id,
          created_at: createdAt,
        },
      });
    });
  }

  return {
    message:
      "Password reset instructions have been sent to your email address.",
    expires_in_minutes: 60,
  };
}
