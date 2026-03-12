import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePost";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditClonePostAtSummaryTransformer } from "../transformers/RedditClonePostAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneMemberMePosts(props: {
  member: MemberPayload;
  body: IRedditClonePost.IRequest;
}): Promise<IPageIRedditClonePost.ISummary> {
  const page = props.body.page ?? 1;
  const pageSize = props.body.page_size ?? 20;
  const skip = (page - 1) * pageSize;
  // Build the whereInput object with all conditions
  const baseWhere: any = {
    reddit_clone_members_id: props.member.id,
    deleted_at: null,
  };
  if (props.body.post_type !== undefined) {
    baseWhere.post_type = props.body.post_type;
  }
  if (props.body.community_id !== undefined) {
    baseWhere.reddit_clone_community_id = props.body.community_id;
  }
  if (props.body.author_id !== undefined) {
    baseWhere.reddit_clone_members_id = props.body.author_id;
  }
  // Build created_at filter
  const createdAtFilter: any = {};
  if (props.body.created_at_from !== undefined) {
    createdAtFilter.gte = new Date(props.body.created_at_from);
  }
  if (props.body.created_at_to !== undefined) {
    createdAtFilter.lte = new Date(props.body.created_at_to);
  }
  if (Object.keys(createdAtFilter).length > 0) {
    baseWhere.created_at = createdAtFilter;
  }
  if (props.body.search !== undefined && props.body.search.length > 0) {
    baseWhere.OR = [
      { title: { contains: props.body.search, mode: "insensitive" } },
      { content: { contains: props.body.search, mode: "insensitive" } },
    ];
  }
  let orderByInput: Prisma.reddit_clone_postsOrderByWithRelationInput = {
    created_at: "desc",
  };
  if (props.body.sort === "hot") {
    orderByInput = { score: "desc" };
  } else if (props.body.sort === "top") {
    orderByInput = { score: "desc" };
    if (
      props.body.time_filter !== undefined &&
      props.body.time_filter !== "all_time"
    ) {
      const now = new Date();
      let startDate = new Date();
      if (props.body.time_filter === "today") {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      } else if (props.body.time_filter === "week") {
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (props.body.time_filter === "month") {
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      } else if (props.body.time_filter === "year") {
        startDate = new Date(now.getFullYear(), 0, 1);
      }
      if (baseWhere.created_at === undefined) {
        baseWhere.created_at = {};
      }
      baseWhere.created_at.gte = startDate;
    }
  } else if (props.body.sort === "controversial") {
    orderByInput = { score: "asc" };
  }
  const data = await MyGlobal.prisma.reddit_clone_posts.findMany({
    where: baseWhere,
    skip: skip,
    take: pageSize,
    orderBy: orderByInput,
    ...RedditClonePostAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_clone_posts.count({
    where: baseWhere,
  });
  const transformedData = await ArrayUtil.asyncMap(
    data,
    RedditClonePostAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: pageSize,
      records: total,
      pages: Math.ceil(total / pageSize),
    } satisfies IPage.IPagination,
    data: transformedData,
  };
}
