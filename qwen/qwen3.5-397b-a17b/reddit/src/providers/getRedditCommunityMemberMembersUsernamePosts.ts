import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunityPostAtSummaryTransformer } from "../transformers/RedditCommunityPostAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCommunityMemberMembersUsernamePosts(props: {
  member: MemberPayload;
  username: string;
}): Promise<IPageIRedditCommunityPost.ISummary> {
  const targetMember =
    await MyGlobal.prisma.reddit_community_members.findUniqueOrThrow({
      where: {
        username: props.username,
        deleted_at: null,
      },
    });
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    reddit_community_member_id: targetMember.id,
    deleted_at: null,
  } satisfies Prisma.reddit_community_postsWhereInput;
  const records = await MyGlobal.prisma.reddit_community_posts.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...RedditCommunityPostAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_community_posts.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      records,
      RedditCommunityPostAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIRedditCommunityPost.ISummary;
}
