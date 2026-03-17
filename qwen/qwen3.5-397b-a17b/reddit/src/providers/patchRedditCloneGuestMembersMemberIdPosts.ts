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
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { RedditClonePostAtSummaryTransformer } from "../transformers/RedditClonePostAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneGuestMembersMemberIdPosts(props: {
  guest: GuestPayload;
  memberId: string & tags.Format<"uuid">;
  body: IRedditClonePost.IRequest;
}): Promise<IPageIRedditClonePost.ISummary> {
  await MyGlobal.prisma.reddit_clone_members.findUniqueOrThrow({
    where: { id: props.memberId },
  });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const timeFilterWhere = (() => {
    if (props.body.sort !== "top" || !props.body.timeFilter) {
      return {};
    }
    const now = new Date();
    switch (props.body.timeFilter) {
      case "today":
        return {
          created_at: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
        };
      case "this_week":
        return {
          created_at: {
            gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
          },
        };
      case "this_month":
        return {
          created_at: {
            gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
          },
        };
      case "this_year":
        return {
          created_at: {
            gte: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000),
          },
        };
      case "all_time":
      default:
        return {};
    }
  })();
  const whereInput = {
    member_id: props.memberId,
    deleted_at: null,
    ...(props.body.search && {
      title: { contains: props.body.search },
    }),
    ...timeFilterWhere,
  } satisfies Prisma.reddit_clone_postsWhereInput;
  const orderByInput = (() => {
    switch (props.body.sort) {
      case "new":
        return { created_at: "desc" as const };
      case "hot":
        return { created_at: "desc" as const };
      case "top":
        return { created_at: "desc" as const };
      case "controversial":
        return { created_at: "desc" as const };
      default:
        return { created_at: "desc" as const };
    }
  })() satisfies Prisma.reddit_clone_postsOrderByWithRelationInput;
  const data = await MyGlobal.prisma.reddit_clone_posts.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...RedditClonePostAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_clone_posts.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      RedditClonePostAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
