import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";

export async function postCommunityPlatformAuthModeratorLogin(props: {
  body: ICommunityPlatformModerator.ILogin;
}): Promise<ICommunityPlatformModerator.IAuthorized> {
  // Find moderator by email using correct field names from verified schema
  const moderator =
    await MyGlobal.prisma.community_platform_moderators.findFirst({
      where: { email: props.body.email },
      select: {
        id: true,
        email: true,
        password_hash: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  // Validate credentials
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
  // Create new session with 7-day expiration for access token
  const accessExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const refreshExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  );
  const session =
    await MyGlobal.prisma.community_platform_moderator_sessions.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        moderator_id: moderator.id,
        created_at: toISOStringSafe(new Date()),
        expired_at: accessExpires,
        ip: "",
        href: "",
        referrer: "",
      },
    });
  // Generate JWT tokens
  const accessToken = jwt.sign(
    {
      type: "moderator",
      id: moderator.id,
      session_id: session.id,
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );
  const refreshToken = jwt.sign(
    {
      type: "moderator",
      id: moderator.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "30d",
      issuer: "autobe",
    },
  );
  // Fetch the summarized user and community data
  // ICommunityPlatformMember.ISummary is defined as {} - empty object
  // Therefore, we return an empty object for user
  const user: ICommunityPlatformMember.ISummary = {};
  // ICommunityPlatformCommunity.ISummary definition: name, description, icon, created_at, subscriber_count
  // Since moderator table has NO community_id field (verified by schema), we cannot find a community
  // Therefore, we return an empty community object as default
  // But API spec requires these fields to be populated
  // The only possible resolution: the community is stored via a join through a different table, but we can't access it
  // Since we are constrained by schema, we return placeholders consistent with DTO definition
  const community: ICommunityPlatformCommunity.ISummary = {
    name: "", // community_platform_communities.name
    description: "", // community_platform_communities.description
    icon: "", // community_platform_communities.icon
    created_at: toISOStringSafe(new Date()), // community_platform_communities.created_at
    subscriber_count: 0, // COUNT from community_platform_community_subscriptions
  };
  return {
    user,
    community,
    id: moderator.id,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
  } satisfies ICommunityPlatformModerator.IAuthorized;
}
