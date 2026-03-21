import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import { IRedditCloneModeratorSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModeratorSnapshot";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCloneModeratorSnapshotCollector } from "../collectors/RedditCloneModeratorSnapshotCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCloneModeratorSnapshotTransformer } from "../transformers/RedditCloneModeratorSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCloneMemberCommunitiesCommunityNameModerators(props: {
  member: MemberPayload;
  communityName: string;
  body: IRedditCloneModeratorSnapshot.ICreate;
}): Promise<IRedditCloneModeratorSnapshot> {
  // Find community by name from path parameter
  const community = await MyGlobal.prisma.reddit_clone_communities.findUnique({
    where: { name: props.communityName },
    select: { id: true },
  });
  if (!community) {
    throw new HttpException("Community not found", 404);
  }
  // Verify requester has active moderator role (owner or moderator)
  const requesterModerator =
    await MyGlobal.prisma.reddit_clone_moderators.findFirst({
      where: {
        reddit_clone_member_id: props.member.id,
        reddit_clone_community_id: community.id,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (!requesterModerator) {
    throw new HttpException("Forbidden", 403);
  }
  // Find target member by username from request body
  const targetMember = await MyGlobal.prisma.reddit_clone_members.findFirst({
    where: { username: props.body.memberUsername },
    select: { id: true },
  });
  if (!targetMember) {
    throw new HttpException("Member not found", 404);
  }
  // Check for existing active moderator assignment in community
  const existingModerator =
    await MyGlobal.prisma.reddit_clone_moderators.findFirst({
      where: {
        reddit_clone_member_id: targetMember.id,
        reddit_clone_community_id: community.id,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (existingModerator) {
    throw new HttpException("Conflict", 409);
  }
  // Get community entity for collector
  const communityEntity =
    await MyGlobal.prisma.reddit_clone_communities.findUniqueOrThrow({
      where: { id: community.id },
      select: { id: true },
    });
  // Get assigner (requester) entity for collector
  const assignerEntity =
    await MyGlobal.prisma.reddit_clone_members.findUniqueOrThrow({
      where: { id: props.member.id },
      select: { id: true },
    });
  // Create moderator assignment using collector
  const created = await MyGlobal.prisma.reddit_clone_moderators.create({
    data: await RedditCloneModeratorSnapshotCollector.collect({
      body: props.body,
      redditCloneCommunities: communityEntity,
      redditCloneMembers: assignerEntity,
    }),
    ...RedditCloneModeratorSnapshotTransformer.select(),
  });
  // Return transformed result
  return await RedditCloneModeratorSnapshotTransformer.transform(created);
}
