import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCloneModeratorCollector } from "../collectors/RedditCloneModeratorCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCloneModeratorTransformer } from "../transformers/RedditCloneModeratorTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCloneMemberCommunitiesCommunityIdModerators(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  body: IRedditCloneModerator.ICreate;
}): Promise<IRedditCloneModerator> {
  // Verify community exists
  const community = await MyGlobal.prisma.reddit_clone_communities.findUnique({
    where: { id: props.communityId },
  });
  if (!community) {
    throw new HttpException("Community not found", 404);
  }
  // Verify requesting member has moderator or owner status in the target community
  const requesterModeratorStatus =
    await MyGlobal.prisma.reddit_clone_moderators.findFirst({
      where: {
        member_id: props.member.id,
        community_id: props.communityId,
        deleted_at: null,
      },
    });
  if (!requesterModeratorStatus) {
    throw new HttpException(
      "Forbidden: You are not a moderator of this community",
      403,
    );
  }
  // Verify target member exists and is not soft deleted
  const targetMember = await MyGlobal.prisma.reddit_clone_members.findUnique({
    where: { id: props.body.member_id },
  });
  if (!targetMember || targetMember.deleted_at !== null) {
    throw new HttpException("Target member not found", 404);
  }
  // Check no existing moderator assignment exists for [community_id, member_id]
  const existingModerator =
    await MyGlobal.prisma.reddit_clone_moderators.findFirst({
      where: {
        community_id: props.communityId,
        member_id: props.body.member_id,
        deleted_at: null,
      },
    });
  if (existingModerator) {
    throw new HttpException(
      "Member is already a moderator in this community",
      409,
    );
  }
  // Create moderator assignment using collector
  const created = await MyGlobal.prisma.reddit_clone_moderators.create({
    data: await RedditCloneModeratorCollector.collect({
      body: props.body,
      redditCloneCommunities: { id: props.communityId },
      redditCloneMembers: { id: props.member.id },
    }),
    ...RedditCloneModeratorTransformer.select(),
  });
  // Transform and return
  return await RedditCloneModeratorTransformer.transform(created);
}
