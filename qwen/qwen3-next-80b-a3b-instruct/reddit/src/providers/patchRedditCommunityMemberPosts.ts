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

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchRedditCommunityMemberPosts(props: {
  member: MemberPayload;
  body: IRedditCommunityPost.IRequest;
}): Promise<IPageIRedditCommunityPost.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  let where: Prisma.reddit_community_postsWhereInput = {
    is_deleted: false,
  };
  let orderBy: Prisma.reddit_community_postsOrderByWithRelationInput;
  switch (props.body.sort) {
    case "hot":
      orderBy = {
        vote_score: "desc",
      };
      break;
    case "new":
      orderBy = {
        created_at: "desc",
      };
      break;
    case "top":
      if (props.body.timeFilter) {
        const now = new Date();
        let since: Date;
        switch (props.body.timeFilter) {
          case "today":
            since = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case "week":
            since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case "month":
            since = new Date(
              now.getFullYear(),
              now.getMonth() - 1,
              now.getDate(),
            );
            break;
          case "year":
            since = new Date(
              now.getFullYear() - 1,
              now.getMonth(),
              now.getDate(),
            );
            break;
          default:
            since = new Date(0);
        }
        where.created_at = {
          gte: since,
        };
      }
      orderBy = {
        vote_score: "desc",
      };
      break;
    case "controversial":
      orderBy = {
        vote_score: "desc",
      };
      break;
    default:
      orderBy = {
        created_at: "desc",
      };
  }
  const data = await MyGlobal.prisma.reddit_community_posts.findMany({
    where,
    orderBy,
    skip,
    take: limit,
    ...RedditCommunityPostAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_community_posts.count({
    where,
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
  };
}
