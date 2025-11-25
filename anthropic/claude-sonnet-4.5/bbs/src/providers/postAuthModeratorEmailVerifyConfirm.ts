import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function postAuthModeratorEmailVerifyConfirm(props: {
  moderator: ModeratorPayload;
  body: IDiscussionBoardModerator.IVerifyEmail;
}): Promise<void> {
  const now = new Date();
  const nowISO = toISOStringSafe(now);

  const verification =
    await MyGlobal.prisma.discussion_board_email_verifications.findFirst({
      where: {
        token: props.body.token,
        discussion_board_member_id: props.moderator.id,
      },
    });

  if (!verification) {
    throw new HttpException(
      "Verification token not found or does not belong to this moderator",
      404,
    );
  }

  if (verification.verified_at !== null) {
    throw new HttpException(
      "This verification token has already been used",
      400,
    );
  }

  if (new Date(verification.expires_at) <= now) {
    throw new HttpException("Verification token has expired", 400);
  }

  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.discussion_board_email_verifications.update({
      where: {
        id: verification.id,
      },
      data: {
        verified_at: nowISO,
      },
    }),
    MyGlobal.prisma.discussion_board_moderators.update({
      where: {
        id: props.moderator.id,
      },
      data: {
        email_verified: true,
        email_verified_at: nowISO,
      },
    }),
  ]);
}
