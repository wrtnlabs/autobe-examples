import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPortalMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalMember";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postAuthMemberPasswordChange(props: {
  member: MemberPayload;
  body: ICommunityPortalMember.IChangePassword;
}): Promise<ICommunityPortalMember.IChangePasswordResult> {
  const { member, body } = props;

  // Token-flow: cannot implement because schema lacks password reset token storage
  if ("resetToken" in body) {
    /**
     * SCHEMA-INTERFACE CONTRADICTION:
     *
     * - API requires a reset-token based password change, but the provided Prisma
     *   schema does not include any model/table to persist or validate
     *   single-use reset tokens issued by POST
     *   /auth/member/password/request-reset.
     * - Implementing token validation without a backing store would be insecure
     *   and speculative. According to the implementation rules, return a mocked
     *   response and document the contradiction so this can be fixed by adding
     *   the necessary schema/service.
     */
    return typia.random<ICommunityPortalMember.IChangePasswordResult>();
  }

  // Authenticated current-password flow
  if ("currentPassword" in body) {
    if (!member) {
      throw new HttpException("Unauthorized", 401);
    }

    const user = await MyGlobal.prisma.community_portal_users.findUniqueOrThrow(
      {
        where: { id: member.id },
      },
    );

    const verified = await PasswordUtil.verify(
      body.currentPassword,
      user.password_hash,
    );
    if (!verified) {
      throw new HttpException("Current password is incorrect", 400);
    }

    const hashed = await PasswordUtil.hash(body.newPassword);
    const now = toISOStringSafe(new Date());

    await MyGlobal.prisma.community_portal_users.update({
      where: { id: member.id },
      data: {
        password_hash: hashed,
        updated_at: now,
      },
    });

    return {
      success: true,
      message: "Password changed successfully.",
    };
  }

  throw new HttpException("Bad Request: missing required fields", 400);
}
