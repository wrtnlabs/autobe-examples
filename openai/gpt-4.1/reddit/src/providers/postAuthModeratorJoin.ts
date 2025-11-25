import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function postAuthModeratorJoin(props: {
  moderator: ModeratorPayload;
  body: ICommunityPlatformModerator.ICreate;
}): Promise<ICommunityPlatformModerator.IAuthorized> {
  const existing =
    await MyGlobal.prisma.community_platform_moderators.findFirst({
      where: { email: props.body.email },
    });
  if (existing) {
    throw new HttpException("Email already registered.", 409);
  }

  const hashedPassword = await PasswordUtil.hash(props.body.password);
  const moderatorId = v4();
  const sessionId = v4();
  const now = toISOStringSafe(new Date());
  const accessExpires = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  const [moderator, session] = await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.community_platform_moderators.create({
      data: {
        id: moderatorId,
        email: props.body.email,
        password_hash: hashedPassword,
        status: props.body.status,
        business_status: props.body.business_status ?? null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    }),
    MyGlobal.prisma.community_platform_moderator_sessions.create({
      data: {
        id: sessionId,
        community_platform_moderator_id: moderatorId,
        ip:
          props.body.ip !== undefined && props.body.ip !== null
            ? (props.body.ip satisfies string as string)
            : "",
        href: props.body.href,
        referrer: props.body.referrer,
        created_at: now,
        expired_at: new Date(Date.now() + 60 * 60 * 1000),
      },
    }),
  ]);

  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        id: moderator.id,
        session_id: session.id,
        type: "moderator",
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "1h",
        issuer: "autobe",
      },
    ),
    refresh: jwt.sign(
      {
        id: moderator.id,
        session_id: session.id,
        type: "moderator",
        tokenType: "refresh",
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };

  return {
    id: moderator.id,
    email: moderator.email,
    status: moderator.status,
    ...(moderator.business_status !== undefined
      ? { business_status: moderator.business_status }
      : {}),
    created_at: toISOStringSafe(moderator.created_at),
    updated_at: toISOStringSafe(moderator.updated_at),
    ...(typeof moderator.deleted_at !== "undefined"
      ? {
          deleted_at:
            moderator.deleted_at === null
              ? null
              : toISOStringSafe(moderator.deleted_at),
        }
      : {}),
    token,
  };
}
