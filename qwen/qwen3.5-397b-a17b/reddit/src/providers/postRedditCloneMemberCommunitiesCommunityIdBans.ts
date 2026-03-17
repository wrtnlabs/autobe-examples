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
import { RedditCloneBanCollector } from "../collectors/RedditCloneBanCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCloneBanTransformer } from "../transformers/RedditCloneBanTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCloneMemberCommunitiesCommunityIdBans(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  body: IRedditCloneBan.ICreate;
}): Promise<IRedditCloneBan> {
  // Verify community exists
  await MyGlobal.prisma.reddit_clone_communities.findUniqueOrThrow({
    where: { id: props.communityId },
  });
  // Verify the member to ban exists
  await MyGlobal.prisma.reddit_clone_members.findUniqueOrThrow({
    where: { id: props.body.member_id },
  });
  // Verify the requesting member is a moderator of this community
  const moderator = await MyGlobal.prisma.reddit_clone_moderators.findFirst({
    where: {
      member_id: props.member.id,
      community_id: props.communityId,
      deleted_at: null,
    },
  });
  if (!moderator) {
    throw new HttpException(
      "Forbidden: You are not a moderator of this community",
      403,
    );
  }
  // Check if an active ban already exists for this member in this community
  const existingBan = await MyGlobal.prisma.reddit_clone_bans.findFirst({
    where: {
      member_id: props.body.member_id,
      community_id: props.communityId,
      deleted_at: null,
    },
  });
  if (existingBan) {
    throw new HttpException(
      "Conflict: This user is already banned from this community",
      409,
    );
  }
  // Create the ban using the Collector
  const created = await MyGlobal.prisma.reddit_clone_bans.create({
    data: await RedditCloneBanCollector.collect({
      body: props.body,
      redditCloneCommunities: { id: props.communityId },
      redditCloneMembers: { id: props.member.id },
      redditCloneMemberSessions: { id: props.member.session_id },
    }),
    ...RedditCloneBanTransformer.select(),
  });
  // Transform and return using the Transformer
  return await RedditCloneBanTransformer.transform(created);
}
