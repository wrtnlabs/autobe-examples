import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePostLink";
import { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { RedditClonePostLinkAtSummaryTransformer } from "../transformers/RedditClonePostLinkAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneGuestPostsPopular(props: {
  guest: GuestPayload;
  body: IRedditClonePostLink.IRequest;
}): Promise<IPageIRedditClonePostLink.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const whereInput = {
    deleted_at: null,
    ...(props.body.postType && { type: props.body.postType }),
  } satisfies Prisma.reddit_clone_postsWhereInput;
  const orderByInput =
    ((): Prisma.reddit_clone_postsOrderByWithRelationInput => {
      const sort = props.body.sort ?? "hot";
      if (sort === "new") {
        return { created_at: "desc" };
      }
      if (sort === "top") {
        return { vote_score: "desc" };
      }
      if (sort === "controversial") {
        return { vote_score: "asc" };
      }
      return { created_at: "desc" };
    })();
  const timeRangeFilter = (() => {
    const sort = props.body.sort ?? "hot";
    const timeRange = props.body.timeRange ?? "all";
    if (sort !== "top" && sort !== "controversial") {
      return undefined;
    }
    if (timeRange === "all") {
      return undefined;
    }
    const now = new Date();
    switch (timeRange) {
      case "day":
        return {
          gte: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        } as Prisma.DateTimeFilter;
      case "week":
        return {
          gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        } as Prisma.DateTimeFilter;
      case "month":
        return {
          gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        } as Prisma.DateTimeFilter;
      case "year":
        return {
          gte: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000),
        } as Prisma.DateTimeFilter;
      default:
        return undefined;
    }
  })();
  const combinedWhere = {
    ...whereInput,
    ...(timeRangeFilter && { created_at: timeRangeFilter }),
  } satisfies Prisma.reddit_clone_postsWhereInput;
  const data = await MyGlobal.prisma.reddit_clone_posts.findMany({
    where: combinedWhere,
    skip: (page - 1) * limit,
    take: limit,
    orderBy: orderByInput,
    ...RedditClonePostLinkAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_clone_posts.count({
    where: combinedWhere,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      RedditClonePostLinkAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
