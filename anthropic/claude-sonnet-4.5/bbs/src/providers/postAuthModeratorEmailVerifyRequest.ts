import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function postAuthModeratorEmailVerifyRequest(props: {
  moderator: ModeratorPayload;
}): Promise<void> {
  const moderator =
    await MyGlobal.prisma.discussion_board_moderators.findUnique({
      where: { id: props.moderator.id },
    });

  if (!moderator) {
    throw new HttpException("Moderator not found", 404);
  }

  if (moderator.email_verified === true) {
    throw new HttpException("Email is already verified", 400);
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  await MyGlobal.prisma.discussion_board_email_verifications.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      discussion_board_member_id: props.moderator.id,
      token: v4() as string & tags.Format<"uuid">,
      email: moderator.email,
      expires_at: toISOStringSafe(expiresAt),
      verified_at: null,
      created_at: toISOStringSafe(now),
    },
  });
}
