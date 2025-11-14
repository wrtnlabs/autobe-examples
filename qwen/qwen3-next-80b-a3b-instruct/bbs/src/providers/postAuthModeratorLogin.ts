import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumModerator";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthModeratorLogin(props: {
  body: IPoliticalForumModerator.ILogin;
}): Promise<IPoliticalForumModerator.IAuthorized> {
  // ILogin is a string containing 'email:password' for login
  const credentials = props.body;

  // Split the string by the last colon to handle emails with colons in local part
  const lastColonIndex = credentials.lastIndexOf(":");
  if (lastColonIndex <= 0 || lastColonIndex === credentials.length - 1) {
    throw new HttpException("Invalid credentials", 401);
  }

  const email = credentials.substring(0, lastColonIndex);
  const password = credentials.substring(lastColonIndex + 1);

  // Look up moderator by email, checking for active status via deleted_at being null
  const moderator = await MyGlobal.prisma.political_forum_moderators.findFirst({
    where: {
      email: email,
      deleted_at: null,
    },
  });

  if (!moderator) {
    throw new HttpException("Invalid credentials", 401);
  }

  // Verify password
  const isValid = await PasswordUtil.verify(password, moderator.password_hash);
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }

  // Create new session
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const session =
    await MyGlobal.prisma.political_forum_moderator_sessions.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        political_forum_moderator_id: moderator.id,
        ip: "",
        href: "",
        referrer: "",
        created_at: toISOStringSafe(new Date()),
        expired_at: toISOStringSafe(accessExpires),
      },
    });

  // Generate JWT tokens
  const accessToken = jwt.sign(
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
  );

  const refreshToken = jwt.sign(
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
  );

  return {
    id: moderator.id,
    email: moderator.email,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    },
  };
}
