import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneComment";
import { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
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
import { RedditCloneCommentAtSummaryTransformer } from "../transformers/RedditCloneCommentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditClonePostsPostIdComments(props: {
  postId: string & tags.Format<"uuid">;
  body: IRedditCloneComment.IRequest;
}): Promise<IPageIRedditCloneComment.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    reddit_clone_post_id: props.postId,
    deleted_at: null,
    ...(props.body.search && {
      content: {
        contains: props.body.search,
        mode: "insensitive",
      },
    }),
    ...(props.body.authorId && {
      reddit_clone_user_profile_id: props.body.authorId,
    }),
    ...(props.body.dateFrom && {
      created_at: {
        gte: new Date(props.body.dateFrom),
      },
    }),
    ...(props.body.dateTo && {
      created_at: {
        lte: new Date(props.body.dateTo),
      },
    }),
  } satisfies Prisma.reddit_clone_commentsWhereInput;
  const orderByInput = (
    props.body.sortOrder === "new"
      ? { created_at: props.body.sortDirection ?? "desc" }
      : props.body.sortOrder === "top"
        ? { votes: { _count: props.body.sortDirection ?? "desc" } }
        : { created_at: props.body.sortDirection ?? "desc" }
  ) satisfies Prisma.reddit_clone_commentsOrderByWithRelationInput;
  const records = await MyGlobal.prisma.reddit_clone_comments.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...RedditCloneCommentAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_clone_comments.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await RedditCloneCommentAtSummaryTransformer.transformAll(records),
  };
}
