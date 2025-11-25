import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardEmailVerification";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function getDiscussionBoardModeratorEmailVerificationsVerificationId(props: {
  moderator: ModeratorPayload;
  verificationId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardEmailVerification> {
  const verification =
    await MyGlobal.prisma.discussion_board_email_verifications.findUnique({
      where: {
        id: props.verificationId,
      },
    });

  if (!verification) {
    throw new HttpException("Email verification record not found", 404);
  }

  return {
    id: verification.id as string & tags.Format<"uuid">,
    discussion_board_member_id:
      verification.discussion_board_member_id as string & tags.Format<"uuid">,
    token: verification.token,
    email: verification.email as string & tags.Format<"email">,
    expires_at: toISOStringSafe(verification.expires_at),
    verified_at: verification.verified_at
      ? toISOStringSafe(verification.verified_at)
      : null,
    created_at: toISOStringSafe(verification.created_at),
  };
}
