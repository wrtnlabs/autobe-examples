import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPlatformAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCommunityAuthPlatformAdminJoin(props: {
  body: IRedditCommunityPlatformAdmin.IJoin;
}): Promise<IRedditCommunityPlatformAdmin.IAuthorized> {
  // 1. Validate input constraints (handled by Typia)
  // 2. Check for duplicate email or username
  const existing =
    await MyGlobal.prisma.reddit_community_platform_admins.findFirst({
      where: {
        OR: [{ email: props.body.email }, { username: props.body.username }],
      },
    });
  if (existing) {
    if (existing.email === props.body.email) {
      throw new HttpException("Email already registered", 409);
    }
    throw new HttpException("Username already taken", 409);
  }
  // 3. Create platform admin record
  const passwordHash = await PasswordUtil.hash(props.body.password);
  const admin = await MyGlobal.prisma.reddit_community_platform_admins.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      email: props.body.email,
      username: props.body.username,
      password_hash: passwordHash,
      karma_score: 0,
      created_at: toISOStringSafe(new Date()) as string &
        tags.Format<"date-time">,
      updated_at: toISOStringSafe(new Date()) as string &
        tags.Format<"date-time">,
      is_deleted: false,
    },
    select: {
      id: true,
      email: true,
      username: true,
      display_name: true,
      bio: true,
      avatar_url: true,
      karma_score: true,
      created_at: true,
      updated_at: true,
      is_deleted: true,
    },
  });
  // 4. Generate and store verification token (64-char crypto-random)
  const verificationToken = v4().replace(/-/g, "") + v4().replace(/-/g, ""); // 64-char hex string using v4()
  const expiresAt = toISOStringSafe(
    new Date(Date.now() + 24 * 60 * 60 * 1000),
  ) as string & tags.Format<"date-time">;
  await MyGlobal.prisma.reddit_community_platform_admin_email_verifications.create(
    {
      data: {
        id: v4() as string & tags.Format<"uuid">,
        reddit_community_platform_admin_id: admin.id,
        token: verificationToken,
        expires_at: expiresAt,
        created_at: toISOStringSafe(new Date()) as string &
          tags.Format<"date-time">,
        updated_at: toISOStringSafe(new Date()) as string &
          tags.Format<"date-time">,
        deleted_at: null,
      },
    },
  );
  // 5. Generate session ID (one single consistent session)
  const sessionId = v4() as string & tags.Format<"uuid">;
  // 6. Generate JWT tokens
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const access = jwt.sign(
    {
      type: "platformadmin",
      id: admin.id,
      session_id: sessionId,
      created_at: toISOStringSafe(new Date()) as string &
        tags.Format<"date-time">,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refresh = jwt.sign(
    {
      type: "platformadmin",
      id: admin.id,
      session_id: sessionId,
      tokenType: "refresh",
      created_at: toISOStringSafe(new Date()) as string &
        tags.Format<"date-time">,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 7. Return IAuthorized
  return {
    id: admin.id,
    email: admin.email,
    username: admin.username,
    display_name: admin.display_name,
    bio: admin.bio,
    avatar_url: admin.avatar_url,
    karma_score: admin.karma_score,
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
    is_deleted: admin.is_deleted,
    access,
    refresh,
    token: {
      access,
      refresh,
      expired_at: toISOStringSafe(accessExpires) as string &
        tags.Format<"date-time">,
      refreshable_until: toISOStringSafe(refreshExpires) as string &
        tags.Format<"date-time">,
    },
  } satisfies IRedditCommunityPlatformAdmin.IAuthorized;
}
