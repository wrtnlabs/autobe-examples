import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPortalMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalMember";
import { ICommunityPortalUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalUser";

export async function postAuthMemberVerifyEmail(props: {
  body: ICommunityPortalMember.IVerifyEmail;
}): Promise<ICommunityPortalMember.IVerifyEmailResult> {
  const { body } = props;

  if (!body || body.userId === undefined || body.userId === null) {
    throw new HttpException("Bad Request: verification token missing", 400);
  }

  // Find membership by user_id (unique)
  const member = await MyGlobal.prisma.community_portal_members.findUnique({
    where: { user_id: body.userId },
  });

  if (!member) {
    return {
      success: false,
      message: "Invalid or expired verification token.",
    };
  }

  // If already verified, fetch user summary and return success
  if (member.is_email_verified) {
    const maybeUser = await MyGlobal.prisma.community_portal_users.findUnique({
      where: { id: body.userId },
    });

    return {
      success: true,
      message: "Email already verified.",
      user: maybeUser
        ? {
            id: maybeUser.id as string & tags.Format<"uuid">,
            username: maybeUser.username,
            display_name: maybeUser.display_name ?? null,
            bio: maybeUser.bio ?? null,
            avatar_uri: maybeUser.avatar_uri ?? null,
            karma: maybeUser.karma,
            created_at: toISOStringSafe(maybeUser.created_at),
            updated_at: toISOStringSafe(maybeUser.updated_at),
          }
        : undefined,
    };
  }

  const now = toISOStringSafe(new Date());

  await MyGlobal.prisma.community_portal_members.update({
    where: { user_id: body.userId },
    data: {
      is_email_verified: true,
      updated_at: now,
    },
  });

  const user = await MyGlobal.prisma.community_portal_users.findUniqueOrThrow({
    where: { id: body.userId },
  });

  return {
    success: true,
    message: "Email verified successfully.",
    user: {
      id: user.id as string & tags.Format<"uuid">,
      username: user.username,
      display_name: user.display_name ?? null,
      bio: user.bio ?? null,
      avatar_uri: user.avatar_uri ?? null,
      karma: user.karma,
      created_at: toISOStringSafe(user.created_at),
      updated_at: toISOStringSafe(user.updated_at),
    },
  };
}
