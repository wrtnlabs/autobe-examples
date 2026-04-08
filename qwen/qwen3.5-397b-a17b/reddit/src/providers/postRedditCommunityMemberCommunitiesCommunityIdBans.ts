import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityBan";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCommunityBanCollector } from "../collectors/RedditCommunityBanCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunityBanTransformer } from "../transformers/RedditCommunityBanTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCommunityMemberCommunitiesCommunityIdBans(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  body: IRedditCommunityBan.ICreate;
}): Promise<IRedditCommunityBan> {
  // Validate community exists
  await MyGlobal.prisma.reddit_community_communities.findUniqueOrThrow({
    where: { id: props.communityId },
  });
  // Check if member is moderator or owner of the community
  const moderator = await MyGlobal.prisma.reddit_community_moderators.findFirst(
    {
      where: {
        reddit_community_community_id: props.communityId,
        reddit_community_member_id: props.member.id,
        deleted_at: null,
      },
    },
  );
  if (!moderator) {
    throw new HttpException(
      "Forbidden: Only moderators or owners can ban members",
      403,
    );
  }
  // Check for existing ban record (unique constraint on community_id + member_id)
  const existingBan = await MyGlobal.prisma.reddit_community_bans.findFirst({
    where: {
      reddit_community_community_id: props.communityId,
      reddit_community_member_id: props.body.reddit_community_member_id,
      deleted_at: null,
    },
  });
  if (existingBan) {
    // If already actively banned, throw conflict error
    if (existingBan.status === "active") {
      throw new HttpException(
        "Member is already banned from this community",
        409,
      );
    }
    // If ban exists with status 'removed', update to new status/reason
    await MyGlobal.prisma.reddit_community_bans.update({
      where: { id: existingBan.id },
      data: {
        status: props.body.status,
        reason: props.body.reason,
        updated_at: new Date().toISOString(),
      },
    });
    const updated =
      await MyGlobal.prisma.reddit_community_bans.findUniqueOrThrow({
        where: { id: existingBan.id },
        ...RedditCommunityBanTransformer.select(),
      });
    return await RedditCommunityBanTransformer.transform(updated);
  }
  // Create new ban record
  const created = await MyGlobal.prisma.reddit_community_bans.create({
    data: await RedditCommunityBanCollector.collect({
      body: props.body,
      redditCommunityCommunities: { id: props.communityId },
      redditCommunityMembers: { id: props.member.id },
    }),
    ...RedditCommunityBanTransformer.select(),
  });
  return await RedditCommunityBanTransformer.transform(created);
}
