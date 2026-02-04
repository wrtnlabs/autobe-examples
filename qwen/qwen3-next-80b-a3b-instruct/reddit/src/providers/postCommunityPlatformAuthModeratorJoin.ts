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

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function postCommunityPlatformAuthModeratorJoin(props: {
  body: ICommunityPlatformModerator.IJoin;
}): Promise<ICommunityPlatformModerator.IAuthorized> {
  // Verify email is unique in community_platform_moderators
  const existing =
    await MyGlobal.prisma.community_platform_moderators.findFirst({
      where: { email: props.body.email },
    });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }
  // Create moderator record manually - no collector available
  const moderator = await MyGlobal.prisma.community_platform_moderators.create({
    data: {
      email: props.body.email,
      password_hash: await PasswordUtil.hash(props.body.password),
      id: v4(),
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      deleted_at: null,
    },
    // Use only existing fields from schema
    select: {
      id: true,
      email: true,
      password_hash: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  // Create moderator session manually - no collector available
  const accessExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const session =
    await MyGlobal.prisma.community_platform_moderator_sessions.create({
      data: {
        id: v4(),
        moderator_id: moderator.id,
        created_at: toISOStringSafe(new Date()),
        expired_at: toISOStringSafe(accessExpires),
        ip: "", // Corrected: use empty string instead of null
        href: "", // Corrected: use empty string instead of null
        referrer: "", // Corrected: use empty string instead of null
      },
      select: {
        id: true,
        moderator_id: true,
        created_at: true,
        expired_at: true,
      },
    });
  // Generate JWT tokens
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
        expiresIn: "7d",
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
        expiresIn: "30d",
        issuer: "autobe",
      },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  // Return ICommunityPlatformModerator.IAuthorized
  // ICommunityPlatformMember.ISummary is an empty object {} per schema
  const user: ICommunityPlatformMember.ISummary = {};
  // ICommunityPlatformCommunity.ISummary requires specific fields
  const community: ICommunityPlatformCommunity.ISummary = {
    name: "", // placeholder - no community context available
    description: "", // placeholder
    icon: "", // placeholder
    subscriber_count: 0,
    created_at: toISOStringSafe(new Date()),
  };
  return {
    user,
    community,
    id: moderator.id,
    token,
  } satisfies ICommunityPlatformModerator.IAuthorized;
}
