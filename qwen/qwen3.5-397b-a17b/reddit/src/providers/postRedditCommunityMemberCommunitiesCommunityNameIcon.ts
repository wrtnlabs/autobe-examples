import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCommunityCommunityIconCollector } from "../collectors/RedditCommunityCommunityIconCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunityCommunityTransformer } from "../transformers/RedditCommunityCommunityTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCommunityMemberCommunitiesCommunityNameIcon(props: {
  member: MemberPayload;
  communityName: string;
  body: IRedditCommunityCommunityIcon.ICreate;
}): Promise<IRedditCommunityCommunity> {
  const community =
    await MyGlobal.prisma.reddit_community_communities.findFirstOrThrow({
      where: {
        name: props.communityName,
        deleted_at: null,
      },
    });
  if (community.reddit_community_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  const existingIcon =
    await MyGlobal.prisma.reddit_community_community_icons.findFirst({
      where: {
        reddit_community_community_id: community.id,
        deleted_at: null,
      },
    });
  if (existingIcon) {
    await MyGlobal.prisma.reddit_community_community_icons.update({
      where: {
        id: existingIcon.id,
      },
      data: {
        deleted_at: new Date(),
      },
    });
  }
  await MyGlobal.prisma.reddit_community_community_icons.create({
    data: await RedditCommunityCommunityIconCollector.collect({
      body: props.body,
      redditCommunityCommunities: {
        id: community.id,
      },
    }),
  });
  const updated =
    await MyGlobal.prisma.reddit_community_communities.findUniqueOrThrow({
      where: {
        id: community.id,
      },
      ...RedditCommunityCommunityTransformer.select(),
    });
  return await RedditCommunityCommunityTransformer.transform(updated);
}
