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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditClonePostLinkAtSummaryTransformer } from "../transformers/RedditClonePostLinkAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneMemberCommunitiesCommunityNamePosts(props: {
  member: MemberPayload;
  communityName: string;
  body: IRedditClonePostLink.IRequest;
}): Promise<IPageIRedditClonePostLink.ISummary> {
  const community =
    await MyGlobal.prisma.reddit_clone_communities.findUniqueOrThrow({
      where: { name: props.communityName },
      select: { id: true },
    });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const timeFilter = (() => {
    if (props.body.sort !== "top" && props.body.sort !== "controversial") {
      return null;
    }
    const timeRange = props.body.timeRange ?? "all";
    const now = new Date();
    switch (timeRange) {
      case "day":
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case "week":
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case "month":
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case "year":
        return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      case "all":
      default:
        return null;
    }
  })();
  const whereInput = {
    reddit_clone_community_id: community.id,
    deleted_at: null,
    ...(props.body.postType !== undefined && { type: props.body.postType }),
    ...(timeFilter !== null && { created_at: { gte: timeFilter } }),
  } satisfies Prisma.reddit_clone_postsWhereInput;
  const orderByInput =
    ((): Prisma.reddit_clone_postsOrderByWithRelationInput => {
      switch (props.body.sort) {
        case "new":
          return { created_at: "desc" };
        case "top":
          return { vote_score: "desc", created_at: "desc" };
        case "controversial":
          return { created_at: "desc" };
        case "hot":
        default:
          return { vote_score: "desc", created_at: "desc" };
      }
    })();
  const transformerSelect = RedditClonePostLinkAtSummaryTransformer.select();
  const posts = await MyGlobal.prisma.reddit_clone_posts.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...transformerSelect,
  });
  const total = await MyGlobal.prisma.reddit_clone_posts.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      posts,
      RedditClonePostLinkAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
