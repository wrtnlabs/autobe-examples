import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import { IRedditCommunityAdminSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdminSettings";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postAuthAdminRefresh(props: {
  admin: AdminPayload;
  body: IRedditCommunityAdmin.IRefresh;
}): Promise<IRedditCommunityAdmin.IAuthorized> {
  let decoded: {
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    type: "admin";
  };

  try {
    decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    ) as {
      id: string & tags.Format<"uuid">;
      session_id: string & tags.Format<"uuid">;
      type: "admin";
    };
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  if (decoded.type !== "admin") {
    throw new HttpException("Invalid token type", 403);
  }

  const adminRecord = await MyGlobal.prisma.reddit_community_admins.findFirst({
    where: { id: decoded.id, deleted_at: null },
    select: {
      id: true,
      email: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      password_hash: true,
    },
  });

  if (!adminRecord) {
    throw new HttpException("Session expired or revoked", 401);
  }

  const nowString = toISOStringSafe(new Date());
  const accessExpireString = toISOStringSafe(
    new Date(Date.now() + 3600 * 1000),
  );
  const refreshExpireString = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 3600 * 1000),
  );

  const newAccess = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: nowString,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const newRefresh = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: nowString,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );

  await MyGlobal.prisma.reddit_community_admin_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: refreshExpireString },
  });

  return {
    id: adminRecord.id,
    email: adminRecord.email,
    name: "", // Removed due to non-existence
    role: "", // Removed due to non-existence
    created_at: toISOStringSafe(adminRecord.created_at),
    updated_at: toISOStringSafe(adminRecord.updated_at),
    deleted_at:
      adminRecord.deleted_at !== null
        ? toISOStringSafe(adminRecord.deleted_at)
        : null,
    is_active: false, // Removed due to non-existence
    last_login_at: null, // Removed due to non-existence
    last_login_ip: null, // Removed due to non-existence
    permissions: [], // Removed due to non-existence
    notes: null, // Removed due to non-existence
    avatar_url: null, // Removed due to non-existence
    settings: undefined, // Removed due to non-existence
    token: {
      access: newAccess,
      refresh: newRefresh,
      expired_at: accessExpireString,
      refreshable_until: refreshExpireString,
    },
  };
}
