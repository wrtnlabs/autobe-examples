import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityBBSModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSModerator";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthModeratorLogin(
  props: {
    body: ICommunityBBSModerator.ILogin;
  },
  ip: string,
  href: string,
  referrer: string,
): Promise<ICommunityBBSModerator.IAuthorized> {
  const moderator = await MyGlobal.prisma.community_bbs_moderator.findFirst({
    where: { email: props.body.email, deleted_at: null },
  });

  if (!moderator) {
    throw new HttpException("Invalid credentials", 401);
  }

  const isValid = await PasswordUtil.verify(
    props.body.password,
    moderator.password_hash,
  );

  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }

  const now = new Date();
  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000);
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const session = await MyGlobal.prisma.community_bbs_moderator_sessions.create(
    {
      data: {
        id: v4(),
        community_bbs_moderator_id: moderator.id,
        ip: ip,
        href: href,
        referrer: referrer,
        created_at: toISOStringSafe(now),
        expired_at: toISOStringSafe(accessExpires),
      },
    },
  );

  const token = {
    access: jwt.sign(
      {
        type: "moderator",
        id: moderator.id,
        session_id: session.id,
        created_at: toISOStringSafe(now),
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
        created_at: toISOStringSafe(now),
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

  return {
    id: moderator.id,
    token,
  } satisfies ICommunityBBSModerator.IAuthorized;
}
