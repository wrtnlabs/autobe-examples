import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";
import { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCommunityModeratorCollector } from "../collectors/RedditCommunityModeratorCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunityModeratorTransformer } from "../transformers/RedditCommunityModeratorTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCommunityMemberCommunitiesCommunityNameModerators(props: {
  member: MemberPayload;
  communityName: string;
  body: IRedditCommunityModerator.ICreate;
}): Promise<IRedditCommunityModerator> {
  const community =
    await MyGlobal.prisma.reddit_community_communities.findUniqueOrThrow({
      where: { name: props.communityName, deleted_at: null },
    });
  const existing = await MyGlobal.prisma.reddit_community_moderators.findFirst({
    where: {
      community_id: community.id,
      member_id: props.body.member_id,
      deleted_at: null,
    },
  });
  if (existing !== null) {
    throw new HttpException("Conflict", 409);
  }
  const created = await MyGlobal.prisma.reddit_community_moderators.create({
    data: await RedditCommunityModeratorCollector.collect({
      body: props.body,
      community: { id: community.id },
      addedBy: { id: props.member.id },
    }),
    ...RedditCommunityModeratorTransformer.select(),
  });
  return await RedditCommunityModeratorTransformer.transform(created);
}
