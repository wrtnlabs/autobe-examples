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
  ip: string;
  body: ICommunityPlatformModerator.IJoin & {
    password: string;
  };
}): Promise<ICommunityPlatformModerator.IAuthorized> {
  const getNowIso = (): string & tags.Format<"date-time"> =>
    toISOStringSafe(new Date()) as string & tags.Format<"date-time">;
  // 1. Check for duplicate email address
  const existing =
    await MyGlobal.prisma.community_platform_moderators.findFirst({
      where: { email: props.body.email },
    });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }
  // 2. Create new moderator record (Collector handles password hashing)
  const moderator = await MyGlobal.prisma.community_platform_moderators.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      email: props.body.email,
      username: props.body.username,
      password_hash: await PasswordUtil.hash(props.body.password),
      display_name: props.body.displayName ?? null,
      bio: props.body.bio ?? null,
      avatar_url: props.body.avatarUrl ?? null,
      karma: 0,
      created_at: getNowIso(),
      updated_at: getNowIso(),
      deleted_at: null,
    },
  });
  // 3. Create session record
  const oneHourMs = 1000 * 60 * 60;
  const oneWeekMs = oneHourMs * 24 * 7;
  const now = new Date();
  const accessExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(now.getTime() + oneHourMs),
  ) as string & tags.Format<"date-time">;
  const refreshExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(now.getTime() + oneWeekMs),
  ) as string & tags.Format<"date-time">;
  const session =
    await MyGlobal.prisma.community_platform_moderator_sessions.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        community_platform_moderator_id: moderator.id,
        ip: props.ip,
        expired_at: accessExpires,
        created_at: getNowIso(),
        href: "",
        referrer: "",
      },
    });
  // 4. Generate JWT tokens
  const nowIso = getNowIso();
  const token = {
    access: jwt.sign(
      {
        type: "moderator",
        id: moderator.id,
        session_id: session.id,
        created_at: nowIso,
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
        created_at: nowIso,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };
  // 5. Return authorized response
  return {
    id: moderator.id,
    token,
  };
}
