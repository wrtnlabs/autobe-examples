import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCloneContentPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneContentPost";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneContentPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentPost";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { OwnerPayload } from "../decorators/payload/OwnerPayload";
import { RedditCloneContentPostAtSummaryTransformer } from "../transformers/RedditCloneContentPostAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneOwnerAnalyticsPostsTrending(props: {
  owner: OwnerPayload;
  body: IRedditCloneContentPost.IRequest;
}): Promise<IPageIRedditCloneContentPost.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where: Prisma.reddit_clone_content_postsWhereInput = {
    deleted_at: null,
  };
  let orderBy: Prisma.reddit_clone_content_postsOrderByWithRelationInput;
  switch (props.body.sort) {
    case "hot":
      orderBy = {
        vote_score: "desc",
        created_at: "desc",
      };
      break;
    case "new":
      orderBy = { created_at: "desc" };
      break;
    case "top":
      orderBy = { vote_score: "desc" };
      break;
    case "controversial":
      orderBy = {
        vote_score: "desc",
        comment_count: "desc",
      };
      break;
    default:
      orderBy = { created_at: "desc" };
  }
  if (props.body.sort === "top" && props.body.timeFilter) {
    const now = new Date();
    let timeThreshold: Date;
    switch (props.body.timeFilter) {
      case "today":
        timeThreshold = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
        );
        break;
      case "week":
        timeThreshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        timeThreshold = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        break;
      case "year":
        timeThreshold = new Date(now.getFullYear() - 1, 0, 1);
        break;
      case "allTime":
      default:
        timeThreshold = new Date(0);
    }
    where.created_at = { gte: timeThreshold };
  }
  const data = await MyGlobal.prisma.reddit_clone_content_posts.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    ...RedditCloneContentPostAtSummaryTransformer.select(),
  });
  const transformedData = await ArrayUtil.asyncMap(data, async (post) => {
    const transformed =
      await RedditCloneContentPostAtSummaryTransformer.transform(post);
    return transformed;
  });
  const total = await MyGlobal.prisma.reddit_clone_content_posts.count({
    where,
  });
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
