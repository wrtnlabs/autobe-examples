import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function postAuthModeratorLogin(props: {
  moderator: ModeratorPayload;
  body: ICommunityPlatformModerator.ILogin;
}): Promise<ICommunityPlatformModerator.IAuthorized> {
  const moderator =
    await MyGlobal.prisma.community_platform_moderators.findFirst({
      where: { email: props.body.email, deleted_at: null },
    });
  if (!moderator) {
    throw new HttpException("Invalid credentials", 401);
  }
  if (moderator.status !== "active") {
    throw new HttpException("Moderator account inactive", 403);
  }
  const validPassword = await PasswordUtil.verify(
    props.body.password,
    moderator.password_hash,
  );
  if (!validPassword) {
    throw new HttpException("Invalid credentials", 401);
  }
  const now = new Date();
  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000);
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const session =
    await MyGlobal.prisma.community_platform_moderator_sessions.create({
      data: {
        id: v4(),
        community_platform_moderator_id: moderator.id,
        ip:
          props.body.ip != null
            ? (props.body.ip satisfies string as string)
            : "",
        href: props.body.href,
        referrer: props.body.referrer,
        created_at: toISOStringSafe(now),
        expired_at: toISOStringSafe(accessExpires),
      },
    });
  const token = {
    access: jwt.sign(
      {
        type: "moderator",
        id: moderator.id,
        session_id: session.id,
        created_at: toISOStringSafe(now),
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
        created_at: toISOStringSafe(now),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  return {
    id: moderator.id,
    email: moderator.email,
    status: moderator.status,
    business_status: moderator.business_status ?? null,
    created_at: toISOStringSafe(moderator.created_at),
    updated_at: toISOStringSafe(moderator.updated_at),
    deleted_at: moderator.deleted_at
      ? toISOStringSafe(moderator.deleted_at)
      : null,
    token,
  };
}
