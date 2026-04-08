import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";
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

export async function postRedditCommunityMemberCommunitiesCommunityIdModerators(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  body: IRedditCommunityModerator.ICreate;
}): Promise<IRedditCommunityModerator> {
  await MyGlobal.prisma.reddit_community_communities.findUniqueOrThrow({
    where: { id: props.communityId },
  });
  const authModerator =
    await MyGlobal.prisma.reddit_community_moderators.findFirst({
      where: {
        reddit_community_community_id: props.communityId,
        reddit_community_member_id: props.member.id,
        deleted_at: null,
      },
      select: {
        role: true,
      },
    });
  if (!authModerator) {
    throw new HttpException(
      "Forbidden: You do not have moderator authority in this community",
      403,
    );
  }
  await MyGlobal.prisma.reddit_community_members.findUniqueOrThrow({
    where: { id: props.body.memberId },
  });
  const created = await MyGlobal.prisma.reddit_community_moderators.create({
    data: await RedditCommunityModeratorCollector.collect({
      body: props.body,
      redditCommunityCommunities: { id: props.communityId },
    }),
    ...RedditCommunityModeratorTransformer.select(),
  });
  return await RedditCommunityModeratorTransformer.transform(created);
}
