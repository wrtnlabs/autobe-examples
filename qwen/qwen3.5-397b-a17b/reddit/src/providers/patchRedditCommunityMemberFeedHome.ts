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

export async function patchRedditCommunityMemberFeedHome(props: {
  member: MemberPayload;
  body: IRedditCommunityPost.IRequest;
}): Promise<IPageIRedditCommunityPost.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const subscriptions =
    await MyGlobal.prisma.reddit_community_subscriptions.findMany({
      where: {
        member_id: props.member.id,
        deleted_at: null,
      },
      select: {
        community_id: true,
      },
    });
  const communityIds = subscriptions.map((s) => s.community_id);
  const whereInput: Prisma.reddit_community_postsWhereInput = {
    deleted_at: null,
    reddit_community_community_id:
      communityIds.length > 0
        ? {
            in: communityIds,
          }
        : undefined,
  };
  const orderByInput: Prisma.reddit_community_postsOrderByWithRelationInput =
    (() => {
      switch (props.body.sort) {
        case "new":
          return { created_at: "desc" };
        case "top":
          return { created_at: "desc" };
        case "controversial":
          return { created_at: "desc" };
        case "hot":
        default:
          return { created_at: "desc" };
      }
    })();
  const data = await MyGlobal.prisma.reddit_community_posts.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...RedditCommunityPostAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_community_posts.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
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
