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

export async function postAuthModeratorJoin(props: {
  body: IPoliticsBbsModerator.ICreate;
}): Promise<IPoliticsBbsModerator.IAuthorized> {
  // Check for duplicate username
  const existingUsername =
    await MyGlobal.prisma.politics_bbs_moderators.findFirst({
      where: { username: props.body.username },
      select: { id: true },
    });
  if (existingUsername) {
    throw new HttpException("Username already exists", 409);
  }

  // Check for duplicate email
  const existingEmail = await MyGlobal.prisma.politics_bbs_moderators.findFirst(
    {
      where: { email: props.body.email },
      select: { id: true },
    },
  );
  if (existingEmail) {
    throw new HttpException("Email already exists", 409);
  }

  // Hash password using PasswordUtil
  const hashedPassword = await PasswordUtil.hash(props.body.password);

  const now = toISOStringSafe(new Date());
  const accessExpires = toISOStringSafe(new Date(Date.now() + 15 * 60 * 1000));
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  );

  // Create moderator account with explicit ID (no @default in schema)
  const moderator = await MyGlobal.prisma.politics_bbs_moderators.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      username: props.body.username,
      password_hash: hashedPassword,
      email: props.body.email,
      created_at: now as string & tags.Format<"date-time">,
      updated_at: now as string & tags.Format<"date-time">,
    },
  });

  // Create session record
  const session = await MyGlobal.prisma.politics_bbs_moderator_sessions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      politics_bbs_moderator_id: moderator.id,
      ip: "127.0.0.1", // Should be extracted from headers in real implementation
      href: "",
      referrer: "",
      created_at: toISOStringSafe(new Date()),
      expired_at: accessExpires,
    },
  });

  // Generate JWT tokens with exact payload structure
  const accessToken = jwt.sign(
    {
      type: "moderator",
      id: moderator.id,
      session_id: session.id,
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "15m", issuer: "autobe" },
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
    { expiresIn: "30d", issuer: "autobe" },
  );

  const token = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  } satisfies IAuthorizationToken;

  const response = {
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
      ? (toISOStringSafe(moderator.deleted_at) satisfies string as string)
      : null,
    token,
  } satisfies IPoliticsBbsModerator.IAuthorized;

  return response;
}
