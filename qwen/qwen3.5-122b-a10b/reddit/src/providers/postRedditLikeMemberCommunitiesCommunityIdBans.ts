import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityBan";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditLikeCommunityBanCollector } from "../collectors/RedditLikeCommunityBanCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditLikeCommunityBanTransformer } from "../transformers/RedditLikeCommunityBanTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditLikeMemberCommunitiesCommunityIdBans(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  body: IRedditLikeCommunityBan.ICreate;
}): Promise<IRedditLikeCommunityBan> {
  // Verify community exists and is not deleted
  const community =
    await MyGlobal.prisma.reddit_like_communities.findUniqueOrThrow({
      where: { id: props.communityId },
      select: { id: true, owner_id: true, deleted_at: true },
    });
  if (community.deleted_at !== null) {
    throw new HttpException("Community not found", 404);
  }
  // Verify authorization - member must be owner OR moderator
  const isOwner = community.owner_id === props.member.id;
  if (!isOwner) {
    const moderator =
      await MyGlobal.prisma.reddit_like_community_moderators.findFirst({
        where: {
          community: { id: props.communityId },
          member: { id: props.member.id },
          deleted_at: null,
        },
      });
    if (moderator === null) {
      throw new HttpException("Forbidden", 403);
    }
  }
  // Verify target member exists and is not deleted
  const targetMember = await MyGlobal.prisma.reddit_like_members.findUnique({
    where: { id: props.body.member_id },
    select: { id: true, deleted_at: true },
  });
  if (targetMember === null || targetMember.deleted_at !== null) {
    throw new HttpException("Member not found", 404);
  }
  // Check no existing active ban
  const existingBan =
    await MyGlobal.prisma.reddit_like_community_bans.findFirst({
      where: {
        community_id: props.communityId,
        member_id: props.body.member_id,
        deleted_at: null,
      },
    });
  if (existingBan !== null) {
    throw new HttpException(
      "Member is already banned from this community",
      400,
    );
  }
  // Create ban record using collector
  const record = await MyGlobal.prisma.reddit_like_community_bans.create({
    data: await RedditLikeCommunityBanCollector.collect({
      body: props.body,
      redditLikeCommunities: { id: props.communityId },
      redditLikeMembers: { id: props.member.id },
    }),
    ...RedditLikeCommunityBanTransformer.select(),
  });
  // Return transformed ban record
  return await RedditLikeCommunityBanTransformer.transform(record);
}
