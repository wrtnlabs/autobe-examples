import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IRedditCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUser";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postAuthAdminLogin(props: {
  admin: AdminPayload;
  body: IRedditCommunityAdmin.ILogin;
}): Promise<IRedditCommunityAdmin.IAuthorized> {
  // Find user by email
  const user = await MyGlobal.prisma.reddit_community_user.findFirst({
    where: { email: props.body.email },
  });

  if (!user) {
    throw new HttpException("Invalid credentials", 401);
  }

  // Find admin by user_id
  const admin = await MyGlobal.prisma.reddit_community_admin.findFirst({
    where: { user_id: user.id },
  });

  if (!admin) {
    throw new HttpException("Invalid credentials", 401);
  }

  // Verify password
  const verified = await PasswordUtil.verify(
    props.body.password,
    user.password_hash,
  );
  if (!verified) {
    throw new HttpException("Invalid credentials", 401);
  }

  // Generate timestamps
  const now = toISOStringSafe(new Date());
  const accessExpires = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  // Create new session
  const sessionId = v4() as string & tags.Format<"uuid">;
  const session = await MyGlobal.prisma.reddit_community_admin_sessions.create({
    data: {
      id: sessionId,
      reddit_community_admin_id: admin.id,
      ip: props.body.ip ?? "",
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      expired_at: null,
    },
  });

  // Generate JWT tokens
  const token = {
    access: jwt.sign(
      {
        type: "admin",
        id: user.id,
        session_id: session.id,
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
        type: "admin",
        id: user.id,
        session_id: session.id,
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

  // Return authorized response
  return {
    id: admin.id,
    user_id: user.id,
    created_at: toISOStringSafe(admin.created_at),
    token: token,
    user: {
      id: user.id,
      email: user.email,
    },
  };
}
