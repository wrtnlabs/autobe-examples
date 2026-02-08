import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformAuthModeratorJoin(props: {
  body: ICommunityPlatformModerator.IJoin & {
    email: string;
    username: string;
    password: string;
    ip?: string;
    href?: string;
    referrer?: string;
  };
}): Promise<ICommunityPlatformModerator.IAuthorized> {
  if (!props.body.email) throw new HttpException("Email is required", 400);
  if (!props.body.username)
    throw new HttpException("Username is required", 400);
  if (!props.body.password)
    throw new HttpException("Password is required", 400);
  const existingEmail =
    await MyGlobal.prisma.community_platform_moderators.findFirst({
      where: { email: props.body.email },
    });
  if (existingEmail) throw new HttpException("Email already registered", 409);
  const existingUsername =
    await MyGlobal.prisma.community_platform_moderators.findFirst({
      where: { username: props.body.username },
    });
  if (existingUsername) throw new HttpException("Username already taken", 409);
  const passwordHash = await PasswordUtil.hash(props.body.password);
  const now = toISOStringSafe(new Date()) as string & tags.Format<"date-time">;
  const accessExpires = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  ) as string & tags.Format<"date-time">;
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  ) as string & tags.Format<"date-time">;
  const moderatorId = v4() as string & tags.Format<"uuid">;
  const moderator = await MyGlobal.prisma.community_platform_moderators.create({
    data: {
      id: moderatorId,
      email: props.body.email,
      password_hash: passwordHash,
      username: props.body.username,
      display_name: null,
      bio: null,
      avatar_url: null,
      karma: 0,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  const sessionId = v4() as string & tags.Format<"uuid">;
  const session =
    await MyGlobal.prisma.community_platform_moderator_sessions.create({
      data: {
        id: sessionId,
        community_platform_moderator_id: moderatorId,
        ip: props.body.ip ?? "",
        href: props.body.href ?? "",
        referrer: props.body.referrer ?? "",
        created_at: now,
        expired_at: refreshExpires,
      },
    });
  const token = {
    access: jwt.sign(
      {
        type: "moderator",
        id: moderator.id,
        session_id: session.id,
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "moderator",
        id: moderator.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };
  return {
    token,
  };
}
