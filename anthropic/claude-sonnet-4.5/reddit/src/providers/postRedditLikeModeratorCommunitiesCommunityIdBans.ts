import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikeCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityBan";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function postRedditLikeModeratorCommunitiesCommunityIdBans(props: {
  moderator: ModeratorPayload;
  communityId: string & tags.Format<"uuid">;
  body: IRedditLikeCommunityBan.ICreate;
}): Promise<IRedditLikeCommunityBan> {
  const { moderator, communityId, body } = props;

  // Verify community exists and is active
  const community = await MyGlobal.prisma.reddit_like_communities.findFirst({
    where: {
      id: communityId,
      deleted_at: null,
    },
  });

  if (!community) {
    throw new HttpException("Community not found or has been deleted", 404);
  }

  // Verify moderator has permission for this community
  const moderatorAssignment =
    await MyGlobal.prisma.reddit_like_community_moderators.findFirst({
      where: {
        community_id: communityId,
        moderator_id: moderator.id,
      },
    });

  if (!moderatorAssignment) {
    throw new HttpException(
      "Unauthorized: You are not a moderator of this community",
      403,
    );
  }

  // Verify moderator has manage_users permission
  const permissions = moderatorAssignment.permissions
    .split(",")
    .map((p) => p.trim());
  if (!permissions.includes("manage_users")) {
    throw new HttpException(
      "Unauthorized: You do not have manage_users permission",
      403,
    );
  }

  // Validate banned member exists and is active
  const bannedMember = await MyGlobal.prisma.reddit_like_members.findFirst({
    where: {
      id: body.banned_member_id,
      deleted_at: null,
    },
  });

  if (!bannedMember) {
    throw new HttpException("Member not found or has been deleted", 404);
  }

  // Prepare values once for reuse
  const now = toISOStringSafe(new Date());
  const banId = v4();
  const expirationDate = body.expiration_date ?? undefined;

  // Create ban record
  await MyGlobal.prisma.reddit_like_community_bans.create({
    data: {
      id: banId,
      banned_member_id: body.banned_member_id,
      community_id: communityId,
      moderator_id: moderator.id,
      ban_reason_category: body.ban_reason_category,
      ban_reason_text: body.ban_reason_text,
      internal_notes: body.internal_notes ?? undefined,
      is_permanent: body.is_permanent,
      expiration_date: expirationDate,
      is_active: true,
      created_at: now,
      updated_at: now,
    },
  });

  // Return using prepared values
  return {
    id: banId,
    banned_member_id: body.banned_member_id,
    community_id: communityId,
    ban_reason_category: body.ban_reason_category,
    ban_reason_text: body.ban_reason_text,
    is_permanent: body.is_permanent,
    expiration_date: expirationDate,
    is_active: true,
    created_at: now,
  };
}
