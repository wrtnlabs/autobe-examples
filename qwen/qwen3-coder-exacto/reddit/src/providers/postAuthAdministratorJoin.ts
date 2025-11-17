import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityForumCommunityAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityAdministrator";
import { ICommunityForumAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumAuthorizationToken";

export async function postAuthAdministratorJoin(props: {
  body: ICommunityForumCommunityAdministrator.ICreate;
}): Promise<ICommunityForumCommunityAdministrator.IAuthorized> {
  // Check if user exists
  const user = await MyGlobal.prisma.community_forum_users.findUnique({
    where: { id: props.body.community_forum_user_id },
  });

  if (!user) {
    throw new HttpException("User not found", 404);
  }

  // Check if user is already an administrator
  const existingAdmin =
    await MyGlobal.prisma.community_forum_administrators.findUnique({
      where: { community_forum_user_id: props.body.community_forum_user_id },
    });

  if (existingAdmin) {
    throw new HttpException("User is already an administrator", 409);
  }

  // Create administrator record
  const createdAt = toISOStringSafe(new Date());
  const administrator =
    await MyGlobal.prisma.community_forum_administrators.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        community_forum_user_id: props.body.community_forum_user_id,
        created_at: createdAt,
        updated_at: createdAt,
      },
    });

  // Create administrator session record
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const session =
    await MyGlobal.prisma.community_forum_administrator_sessions.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        community_forum_administrator_id: administrator.id,
        created_at: toISOStringSafe(new Date()),
        expired_at: toISOStringSafe(accessExpires),
        ip: "127.0.0.1",
        href: "/api/auth/administrator/join",
        referrer: "" as string, // Fix null assignment by using empty string
      },
    });

  // Generate JWT tokens with correct payload structure
  const tokenCreatedAt = toISOStringSafe(new Date());
  const accessToken = jwt.sign(
    {
      type: "administrator",
      id: administrator.id,
      session_id: session.id,
      created_at: tokenCreatedAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      type: "administrator",
      id: administrator.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: tokenCreatedAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // Return authorized administrator response
  return {
    id: administrator.id,
    community_forum_user_id: administrator.community_forum_user_id,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    },
  };
}
