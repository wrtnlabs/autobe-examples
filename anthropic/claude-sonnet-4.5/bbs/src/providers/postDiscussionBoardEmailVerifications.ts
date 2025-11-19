import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardEmailVerification";

export async function postDiscussionBoardEmailVerifications(props: {
  body: IDiscussionBoardEmailVerification.ICreate;
}): Promise<IDiscussionBoardEmailVerification> {
  const { discussion_board_member_id, email } = props.body;

  const member = await MyGlobal.prisma.discussion_board_members.findUnique({
    where: { id: discussion_board_member_id },
  });

  if (!member) {
    throw new HttpException("Member not found", 404);
  }

  if (member.email !== email) {
    throw new HttpException(
      "Email address does not match member's registered email",
      400,
    );
  }

  if (member.email_verified) {
    throw new HttpException("Email address is already verified", 400);
  }

  const oneHourAgo = new Date();
  oneHourAgo.setHours(oneHourAgo.getHours() - 1);

  const recentVerifications =
    await MyGlobal.prisma.discussion_board_email_verifications.count({
      where: {
        discussion_board_member_id,
        created_at: { gte: oneHourAgo },
      },
    });

  if (recentVerifications >= 3) {
    throw new HttpException(
      "Rate limit exceeded. Maximum 3 verification emails per hour",
      429,
    );
  }

  const token = v4();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const verification =
    await MyGlobal.prisma.discussion_board_email_verifications.create({
      data: {
        id: v4(),
        discussion_board_member_id,
        token,
        email,
        expires_at: expiresAt,
        verified_at: null,
        created_at: now,
      },
    });

  return {
    id: verification.id,
    discussion_board_member_id: verification.discussion_board_member_id,
    token: verification.token,
    email: verification.email,
    expires_at: toISOStringSafe(verification.expires_at),
    verified_at:
      verification.verified_at === null
        ? undefined
        : toISOStringSafe(verification.verified_at),
    created_at: toISOStringSafe(verification.created_at),
  };
}
