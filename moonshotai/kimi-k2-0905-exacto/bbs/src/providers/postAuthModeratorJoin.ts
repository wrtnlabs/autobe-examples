import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicDiscussionModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerator";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthModeratorJoin(props: {
  body: IEconomicDiscussionModerator.ICreate;
}): Promise<IEconomicDiscussionModerator.IAuthorized> {
  // Check for duplicate username
  const existingUsername =
    await MyGlobal.prisma.economic_discussion_moderators.findUnique({
      where: { username: props.body.username },
    });

  if (existingUsername) {
    throw new HttpException("Username already exists", 409);
  }

  // Check for duplicate email
  const existingEmail =
    await MyGlobal.prisma.economic_discussion_moderators.findUnique({
      where: { email: props.body.email },
    });

  if (existingEmail) {
    throw new HttpException("Email already exists", 409);
  }

  // Hash password
  const hashedPassword = await PasswordUtil.hash(props.body.password_hash);

  // Create moderator record
  const moderator = await MyGlobal.prisma.economic_discussion_moderators.create(
    {
      data: {
        id: v4() as string & tags.Format<"uuid">,
        username: props.body.username,
        email: props.body.email,
        password_hash: hashedPassword,
        email_verified: props.body.email_verified ?? false,
        two_factor_enabled: props.body.two_factor_enabled ?? false,
        moderation_level: props.body.moderation_level,
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
      },
    },
  );

  // Create session
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const session =
    await MyGlobal.prisma.economic_discussion_moderator_sessions.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        economic_discussion_moderator_id: moderator.id,
        ip: "0.0.0.0", // Server-side default since no IP in props
        href: "/auth/moderator/join",
        referrer: null,
        created_at: toISOStringSafe(new Date()),
        expired_at: toISOStringSafe(accessExpires),
      },
    });

  // Generate JWT tokens
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "moderator",
        id: moderator.id,
        session_id: session.id,
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "1h",
        issuer: "autobe",
      },
    ),
    refresh: jwt.sign(
      {
        type: "moderator",
        id: moderator.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };

  // Return moderator data
  return {
    id: moderator.id,
    username: moderator.username,
    email: moderator.email,
    email_verified: moderator.email_verified,
    two_factor_enabled: moderator.two_factor_enabled,
    moderation_level: moderator.moderation_level,
    created_at: toISOStringSafe(moderator.created_at),
    updated_at: toISOStringSafe(moderator.updated_at),
    token,
  };
}
