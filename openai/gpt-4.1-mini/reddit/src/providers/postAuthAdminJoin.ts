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

export async function postAuthAdminJoin(props: {
  admin: AdminPayload;
  body: IRedditCommunityAdmin.ICreate;
}): Promise<IRedditCommunityAdmin.IAuthorized> {
  const { user_id } = props.body;

  // Validate user existence
  const user = await MyGlobal.prisma.reddit_community_user.findUnique({
    where: { id: user_id },
    select: {
      id: true,
      email: true,
      created_at: true,
    },
  });

  if (user === null) {
    throw new HttpException(`User with id ${user_id} not found`, 404);
  }

  // Generate UUID and timestamps
  const adminId = v4();
  const createdAt = toISOStringSafe(new Date());

  // Create admin record
  const admin = await MyGlobal.prisma.reddit_community_admin.create({
    data: {
      id: adminId,
      user_id: user_id,
      created_at: createdAt,
    },
    select: {
      id: true,
      user_id: true,
      created_at: true,
    },
  });

  // Create session record
  const sessionId = v4();
  const now = toISOStringSafe(new Date());
  const accessExpireDate = toISOStringSafe(
    new Date(Date.now() + 1_800_000 * 2),
  ); // 1 hour
  const refreshExpireDate = toISOStringSafe(new Date(Date.now() + 604_800_000)); // 7 days

  const session = await MyGlobal.prisma.reddit_community_admin_sessions.create({
    data: {
      id: sessionId,
      reddit_community_admin_id: adminId,
      created_at: now,
      expired_at: accessExpireDate,
      ip: "",
      href: "",
      referrer: "",
    },
    select: {
      id: true,
      created_at: true,
      expired_at: true,
    },
  });

  // Generate JWT tokens
  const issuedAt = toISOStringSafe(new Date());
  const accessToken = jwt.sign(
    {
      type: "admin",
      id: user.id,
      session_id: session.id,
      created_at: issuedAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );

  const refreshToken = jwt.sign(
    {
      type: "admin",
      id: user.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: issuedAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );

  // Compose token response
  const token = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: accessExpireDate,
    refreshable_until: refreshExpireDate,
  };

  return {
    id: admin.id,
    user_id: admin.user_id,
    created_at: createdAt,
    token,
    user: {
      id: user.id,
      email: user.email,
    },
  };
}
