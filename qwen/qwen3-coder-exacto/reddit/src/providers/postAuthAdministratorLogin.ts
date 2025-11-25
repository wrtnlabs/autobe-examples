import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityForumCommunityAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityAdministrator";
import { ICommunityForumAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumAuthorizationToken";

export async function postAuthAdministratorLogin(props: {
  body: ICommunityForumCommunityAdministrator.ILogin;
}): Promise<ICommunityForumCommunityAdministrator.IAuthorized> {
  // 1. Find user by email first
  const user = await MyGlobal.prisma.community_forum_users.findFirst({
    where: {
      email: props.body.email,
    },
  });

  if (!user) {
    throw new HttpException("Invalid credentials", 401);
  }

  // 2. Verify password
  const isValid = await PasswordUtil.verify(
    props.body.password,
    user.password_hash,
  );

  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }

  // 3. Check if user is an administrator
  const administrator =
    await MyGlobal.prisma.community_forum_administrators.findFirst({
      where: {
        community_forum_user_id: user.id,
      },
    });

  if (!administrator) {
    throw new HttpException("Invalid credentials", 401);
  }

  // 4. Create new session
  const accessExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  const session =
    await MyGlobal.prisma.community_forum_administrator_sessions.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        community_forum_administrator_id: administrator.id,
        ip: props.body.ip ?? "", // Fix IP handling - use empty string instead of null
        href: props.body.href,
        referrer: props.body.referrer,
        created_at: toISOStringSafe(new Date()),
        expired_at: accessExpires,
      },
    });

  // 5. Generate JWT tokens
  const token: ICommunityForumAuthorizationToken = {
    access: jwt.sign(
      {
        type: "administrator",
        id: administrator.community_forum_user_id,
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
        type: "administrator",
        id: administrator.community_forum_user_id,
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
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };

  // 6. Return authorized response
  return {
    id: administrator.id,
    community_forum_user_id: administrator.community_forum_user_id,
    token,
  };
}
