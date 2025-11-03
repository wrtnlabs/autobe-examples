import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPoliticsBbsModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsModerator";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthModeratorLogin(props: {
  body: IPoliticsBbsModerator.ILogin;
}): Promise<IPoliticsBbsModerator.IAuthorized> {
  // Step 1: Find moderator by username or email
  const moderator = await MyGlobal.prisma.politics_bbs_moderators.findFirst({
    where: {
      OR: [
        { username: props.body.username_or_email },
        { email: props.body.username_or_email },
      ],
      deleted_at: null, // Don't find soft-deleted accounts
    },
  });

  // Validate moderator exists
  if (!moderator) {
    throw new HttpException("Invalid credentials", 401);
  }

  // Step 2: Verify password
  const isValid = await PasswordUtil.verify(
    props.body.password,
    moderator.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }

  // Step 3: Create new session record - MUST provide explicit id
  const accessExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
  const refreshExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  const sessionId = v4();

  await MyGlobal.prisma.politics_bbs_moderator_sessions.create({
    data: {
      id: sessionId,
      politics_bbs_moderator_id: moderator.id,
      ip: props.body.ip ?? "",
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: toISOStringSafe(new Date()),
      expired_at: null,
    },
  });

  // Step 4: Generate JWT tokens
  const accessToken = jwt.sign(
    {
      type: "moderator",
      id: moderator.id,
      session_id: sessionId,
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "15m",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      type: "moderator",
      id: moderator.id,
      session_id: sessionId,
      tokenType: "refresh",
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "30d",
      issuer: "autobe",
    },
  );

  const authorizationToken = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };

  // Step 5: Return authorized moderator with token
  return {
    id: moderator.id,
    username: moderator.username,
    email: moderator.email,
    created_at: toISOStringSafe(
      moderator.created_at,
    ) satisfies string as string,
    updated_at: toISOStringSafe(
      moderator.updated_at,
    ) satisfies string as string,
    deleted_at: moderator.deleted_at
      ? toISOStringSafe(moderator.deleted_at)
      : undefined,
    token: authorizationToken,
  };
}
