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

export async function postAuthModeratorJoin(props: {
  body: ICommunityBBSModerator.ICreate;
}): Promise<ICommunityBBSModerator.IAuthorized> {
  // Parse the body as JSON since it's a JSON string in ICreate
  const bodyJson = JSON.parse(props.body) as Record<string, any>;

  // Validate uniqueness
  const existingEmail = await MyGlobal.prisma.community_bbs_moderator.findFirst(
    {
      where: {
        email: bodyJson.email,
      },
    },
  );
  if (existingEmail) {
    throw new HttpException("Email already registered", 409);
  }

  const existingUsername =
    await MyGlobal.prisma.community_bbs_moderator.findFirst({
      where: {
        username: bodyJson.username,
      },
    });
  if (existingUsername) {
    throw new HttpException("Username already registered", 409);
  }

  // Hash password
  const hashedPassword = await PasswordUtil.hash(bodyJson.password);

  // Create moderator record
  const moderator = await MyGlobal.prisma.community_bbs_moderator.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      email: bodyJson.email,
      username: bodyJson.username,
      password_hash: hashedPassword,
      nickname: bodyJson.nickname ?? null,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      deleted_at: null,
    },
  });

  // Create session record
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const session = await MyGlobal.prisma.community_bbs_moderator_sessions.create(
    {
      data: {
        id: v4() as string & tags.Format<"uuid">,
        community_bbs_moderator_id: moderator.id,
        ip: bodyJson.ip ?? null,
        href: bodyJson.href,
        referrer: bodyJson.referrer,
        created_at: toISOStringSafe(new Date()),
        expired_at: toISOStringSafe(accessExpires),
      },
    },
  );

  // Generate JWT token
  const token = {
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

  return {
    id: moderator.id,
    token,
  };
}
