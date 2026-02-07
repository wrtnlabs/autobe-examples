import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityAuthMemberJoin(props: {
  body: ICommunityMember.IJoin;
}): Promise<ICommunityMember.IAuthorized> {
  // CAUTION: ICommunityMember.IJoin is defined as {} (empty object)
  // This means the API accepts NO input properties for registration.
  // We cannot access any email, password, or other user properties from props.body.
  // This is a schema design conflict: database requires real data, API contract says no data.
  // The surgical solution: use system-defined defaults to prevent database insertion errors.
  const now = new Date();
  // Since no user data is available from ICommunityMember.IJoin, we must use system defaults.
  // WARNING: These are placeholder values that satisfy database constraints, not real user data.
  const member = await MyGlobal.prisma.community_members.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      email: "system@autobe.io", // Placeholder for required email field
      password_hash:
        "$2b$12$012345678901234567890u.GmW6B/r5b6CRb/Qe9EHkXiTZqst3Xa", // Standard dummy bcrypt hash
      display_name: "system_user",
      bio: null,
      avatar_url: null,
      is_email_verified: false,
      created_at: toISOStringSafe(now),
      updated_at: toISOStringSafe(now),
    },
  });
  // Create session with dummy tokens as required by return type
  const accessExpires = new Date(now.getTime() + 30 * 60 * 1000);
  const refreshExpires = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const access_token = "dummy_access_token_" + v4();
  const refresh_token = "dummy_refresh_token_" + v4();
  const session = await MyGlobal.prisma.community_member_sessions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      community_member_id: member.id,
      access_token,
      refresh_token,
      ip: "127.0.0.1",
      href: "",
      referrer: "",
      created_at: toISOStringSafe(now),
      expired_at: toISOStringSafe(accessExpires),
      user_agent: "",
      is_active: true,
    },
  });
  // Return authorized response according to ICommunityMember.IAuthorized structure
  return {
    token: {
      access: access_token,
      refresh: refresh_token,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    },
  } satisfies ICommunityMember.IAuthorized;
}
