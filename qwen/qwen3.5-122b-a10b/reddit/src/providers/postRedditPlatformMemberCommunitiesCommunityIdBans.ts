import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import { IRedditPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFile";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditPlatformCommunityBanCollector } from "../collectors/RedditPlatformCommunityBanCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformCommunityBanTransformer } from "../transformers/RedditPlatformCommunityBanTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditPlatformMemberCommunitiesCommunityIdBans(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  body: IRedditPlatformCommunityBan.ICreate;
}): Promise<IRedditPlatformCommunityBan> {
  // 1. Verify community exists and is not deleted
  const community = await MyGlobal.prisma.reddit_platform_communities.findFirst(
    {
      where: {
        id: props.communityId,
        deleted_at: null,
      },
    },
  );
  if (community === null) {
    throw new HttpException("Community not found", 404);
  }
  // 2. Verify requesting member is owner or moderator of the community
  const isOwner = community.owner_id === props.member.id;
  if (!isOwner) {
    const isModerator =
      await MyGlobal.prisma.reddit_platform_community_moderators.findFirst({
        where: {
          reddit_platform_community_id: props.communityId,
          reddit_platform_member_id: props.member.id,
          deleted_at: null,
        },
      });
    if (isModerator === null) {
      throw new HttpException(
        "Forbidden: You are not a moderator of this community",
        403,
      );
    }
  }
  // 3. Verify target member exists and is not deleted
  const targetMember = await MyGlobal.prisma.reddit_platform_members.findFirst({
    where: {
      id: props.body.reddit_platform_member_id,
      deleted_at: null,
    },
  });
  if (targetMember === null) {
    throw new HttpException("Member not found", 404);
  }
  // 4. Prevent self-banning
  if (props.body.reddit_platform_member_id === props.member.id) {
    throw new HttpException("Cannot ban yourself", 400);
  }
  // 5. Check for existing active ban
  const existingBan =
    await MyGlobal.prisma.reddit_platform_community_bans.findFirst({
      where: {
        reddit_platform_community_id: props.communityId,
        reddit_platform_member_id: props.body.reddit_platform_member_id,
        deleted_at: null,
      },
    });
  if (existingBan !== null) {
    throw new HttpException(
      "Member is already banned from this community",
      409,
    );
  }
  // 6. Create ban record
  const ban = await MyGlobal.prisma.reddit_platform_community_bans.create({
    data: await RedditPlatformCommunityBanCollector.collect({
      body: props.body,
      redditPlatformCommunities: community,
      redditPlatformMembers: { id: props.member.id },
    }),
    ...RedditPlatformCommunityBanTransformer.select(),
  });
  // 7. Return ban record
  return await RedditPlatformCommunityBanTransformer.transform(ban);
}
