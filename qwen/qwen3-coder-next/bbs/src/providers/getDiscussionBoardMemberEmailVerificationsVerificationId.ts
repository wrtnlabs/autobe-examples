import { IDiscussionBoardMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberEmailVerification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardMemberEmailVerificationsVerificationId(props: {
  member: MemberPayload;
  verificationId: string;
}): Promise<IDiscussionBoardMemberEmailVerification> {
  const verification =
    await MyGlobal.prisma.discussion_board_member_email_verifications.findUnique(
      {
        where: {
          id: props.verificationId,
          member_id: props.member.id,
          deleted_at: null,
        },
      },
    );
  if (!verification) {
    throw new HttpException("Email verification not found", 404);
  }
  return {
    id: verification.id,
    member_id: verification.member_id,
    token: verification.token,
    expires_at: toISOStringSafe(verification.expires_at),
    verified_at: verification.verified_at
      ? toISOStringSafe(verification.verified_at)
      : null,
    ip: verification.ip,
    user_agent: verification.user_agent,
    created_at: toISOStringSafe(verification.created_at),
    updated_at: toISOStringSafe(verification.updated_at),
    deleted_at: verification.deleted_at
      ? toISOStringSafe(verification.deleted_at)
      : null,
  };
}
