import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthModeratorJoin(props: {
  body: ICommunityPlatformModerator.IJoin;
}): Promise<ICommunityPlatformModerator.IAuthorized> {
  const now = toISOStringSafe(new Date());
  const { email, password, community_id } = props.body;

  // Step 1: Find a verified member by email
  const member = await MyGlobal.prisma.community_platform_members.findUnique({
    where: { email },
  });
  if (!member) {
    throw new HttpException("No registered member exists for this email.", 404);
  }
  if (member.email_verified !== true) {
    throw new HttpException(
      "You must verify your email before registering as moderator.",
      400,
    );
  }

  // Step 2: Check community exists
  const community =
    await MyGlobal.prisma.community_platform_communities.findUnique({
      where: { id: community_id },
    });
  if (!community) {
    throw new HttpException("Community with this ID does not exist.", 404);
  }

  // Step 3: Check existing moderator email
  const existingMod =
    await MyGlobal.prisma.community_platform_moderators.findUnique({
      where: { email },
    });
  if (existingMod) {
    throw new HttpException("A moderator with this email already exists.", 409);
  }

  // Step 4: Hash password
  const password_hash = await PasswordUtil.hash(password);

  // Step 5: Create moderator row
  const created = await MyGlobal.prisma.community_platform_moderators.create({
    data: {
      id: v4(),
      member_id: member.id,
      community_id,
      email,
      password_hash,
      status: "active",
      created_at: now,
      updated_at: now,
    },
  });

  // Step 6: Generate JWT tokens for login
  const accessExpire = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
  const refreshExpire = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
  const token: IAuthorizationToken = {
    access: jwt.sign(
      { id: created.id, type: "moderator" },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      { id: created.id, type: "moderator" },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: toISOStringSafe(accessExpire),
    refreshable_until: toISOStringSafe(refreshExpire),
  };

  // Step 7: Return IAuthorized object. Ensure deleted_at is undefined if null.
  return {
    id: created.id,
    member_id: created.member_id,
    community_id: created.community_id,
    email: created.email,
    status: created.status,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at === null
        ? undefined
        : toISOStringSafe(created.deleted_at),
    token: token,
  };
}
