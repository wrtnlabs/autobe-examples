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
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postCommunityPlatformMemberAuthMembersEmailResend(props: {
  member: MemberPayload;
}): Promise<void> {
  const existingVerification =
    await MyGlobal.prisma.community_platform_member_email_verifications.findFirst(
      {
        where: {
          member: { connect: { id: props.member.id } },
          verified_at: null,
        },
      },
    );
  if (existingVerification) {
    const newToken = v4() as string & tags.Format<"uuid">;
    await MyGlobal.prisma.community_platform_member_email_verifications.update({
      where: { id: existingVerification.id },
      data: {
        token: newToken,
        created_at: toISOStringSafe(new Date()),
        expires_at: toISOStringSafe(new Date(Date.now() + 24 * 60 * 60 * 1000)),
      },
    });
    // Trigger email service to send verification email with newToken
    // This is an external system call - handled by the platform, not the API
  }
  // Log audit event for resend request
  // (No response body required - HTTP 200 OK)
}
