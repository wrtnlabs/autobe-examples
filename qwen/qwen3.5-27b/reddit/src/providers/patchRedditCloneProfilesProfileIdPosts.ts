import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePost";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditClonePostAtSummaryTransformer } from "../transformers/RedditClonePostAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneProfilesProfileIdPosts(props: {
  profileId: string & tags.Format<"uuid">;
  body: IRedditClonePost.IRequest;
}): Promise<IPageIRedditClonePost.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 25, 100);
  const skip = (page - 1) * limit;
  const whereInput: Prisma.reddit_clone_postsWhereInput = {
    reddit_clone_user_profile_id: props.profileId,
    deleted_at: null,
    ...(props.body.communityId && {
      reddit_clone_community_id: props.body.communityId,
    }),
    ...(props.body.searchQuery && {
      title: {
        contains: props.body.searchQuery,
        mode: "insensitive",
      },
    }),
    ...(props.body.postType && {
      post_type: props.body.postType,
    }),
    ...(props.body.sortType === "top" &&
      props.body.timeFilter &&
      props.body.timeFilter !== "all" && {
        created_at: {
          gte: (() => {
            const now = new Date();
            const cutoff = new Date(now.getTime());
            switch (props.body.timeFilter) {
              case "today":
                cutoff.setHours(cutoff.getHours() - 24);
                break;
              case "week":
                cutoff.setDate(cutoff.getDate() - 7);
                break;
              case "month":
                cutoff.setDate(cutoff.getDate() - 30);
                break;
              case "year":
                cutoff.setDate(cutoff.getDate() - 365);
                break;
            }
            return cutoff;
          })(),
        },
      }),
  };
  const orderByInput: Prisma.reddit_clone_postsOrderByWithRelationInput = {
    created_at: "desc" as const,
  };
  const records = await MyGlobal.prisma.reddit_clone_posts.findMany({
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
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      RedditClonePostAtSummaryTransformer.transform,
    ),
  };
}
