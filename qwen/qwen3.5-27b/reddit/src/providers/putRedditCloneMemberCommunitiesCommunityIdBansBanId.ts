import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneBan";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCloneBanTransformer } from "../transformers/RedditCloneBanTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditCloneMemberCommunitiesCommunityIdBansBanId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  banId: string & tags.Format<"uuid">;
  body: IRedditCloneBan.IUpdate;
}): Promise<IRedditCloneBan> {
  // Check if member is moderator or owner of the community
  const moderator =
    await MyGlobal.prisma.reddit_clone_community_moderators.findFirst({
      where: {
        community: {
          id: props.communityId,
        },
        member: {
          id: props.member.id,
        },
        deleted_at: null,
      },
    });
  const community = await MyGlobal.prisma.reddit_clone_communities.findUnique({
    where: { id: props.communityId },
    select: { owner_id: true },
  });
  const isOwner = community?.owner_id === props.member.id;
  if (!moderator && !isOwner) {
    throw new HttpException("Forbidden", 403);
  }
  // Find the ban record
  const ban = await MyGlobal.prisma.reddit_clone_bans.findUniqueOrThrow({
    where: {
      id: props.banId,
      deleted_at: null,
    },
    select: {
      id: true,
      community_id: true,
      banned_at: true,
      lifted_at: true,
    },
  });
  // Verify ban belongs to the specified community
  if (ban.community_id !== props.communityId) {
    throw new HttpException("Not Found", 404);
  }
  // Build update data
  const updateData: any = {};
  if (props.body.reason !== undefined) {
    updateData.reason = props.body.reason;
  }
  if (props.body.lifted_at !== undefined) {
    // If ban is already lifted, cannot re-activate (set to null)
    if (ban.lifted_at !== null && props.body.lifted_at === null) {
      throw new HttpException("Cannot re-activate a lifted ban", 400);
    }
    // If setting lifted_at, ensure it's after banned_at
    if (props.body.lifted_at !== null) {
      const liftedDate = new Date(props.body.lifted_at);
      if (liftedDate < ban.banned_at) {
        throw new HttpException("lifted_at must be after banned_at", 400);
      }
      updateData.lifted_at = liftedDate;
    } else {
      updateData.lifted_at = null;
    }
  }
  updateData.updated_at = new Date();
  // Update the ban record
  const updated = await MyGlobal.prisma.reddit_clone_bans.update({
    where: { id: props.banId },
    data: updateData,
    ...RedditCloneBanTransformer.select(),
  });
  return await RedditCloneBanTransformer.transform(updated);
}
