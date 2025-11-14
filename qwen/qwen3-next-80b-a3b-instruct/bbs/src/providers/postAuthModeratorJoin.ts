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

export async function postAuthModeratorJoin(props: {
  body: IPoliticalForumModerator.ICreate;
}): Promise<IPoliticalForumModerator.IAuthorized> {
  // Check for existing moderator with same email
  const existingModerator =
    await MyGlobal.prisma.political_forum_moderators.findFirst({
      where: { email: props.body.email },
    });

  if (existingModerator) {
    throw new HttpException("Email already registered", 409);
  }

  // Hash the password using PasswordUtil (mandatory)
  const hashedPassword = await PasswordUtil.hash(props.body.password);

  // Create the moderator account (actor record)
  const moderator = await MyGlobal.prisma.political_forum_moderators.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      email: props.body.email,
      password_hash: hashedPassword,
      created_at: toISOStringSafe(new Date()) as string &
        tags.Format<"date-time">,
      updated_at: toISOStringSafe(new Date()) as string &
        tags.Format<"date-time">,
      email_verified: false,
    },
  });

  // Create corresponding session record
  const accessExpiresMs = Date.now() + 60 * 60 * 1000;
  const refreshExpiresMs = Date.now() + 7 * 24 * 60 * 60 * 1000;

  const session =
    await MyGlobal.prisma.political_forum_moderator_sessions.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        political_forum_moderator_id: moderator.id,
        ip: "", // Required field from schema, default to empty string
        href: "", // Required field from schema, default to empty string
        referrer: "", // Required field from schema, default to empty string
        created_at: toISOStringSafe(new Date()) as string &
          tags.Format<"date-time">,
        expired_at: toISOStringSafe(new Date(accessExpiresMs)) as string &
          tags.Format<"date-time">,
      },
    });

  // Generate JWT tokens with exact payload structure
  const now = toISOStringSafe(new Date()) as string & tags.Format<"date-time">;
  const accessToken = jwt.sign(
    {
      type: "moderator",
      id: moderator.id,
      session_id: session.id,
      created_at: now,
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
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // Return the authorized response
  return {
    id: moderator.id,
    email: moderator.email,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(new Date(accessExpiresMs)) as string &
        tags.Format<"date-time">,
      refreshable_until: toISOStringSafe(new Date(refreshExpiresMs)) as string &
        tags.Format<"date-time">,
    },
  };
}
