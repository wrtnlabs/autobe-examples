import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformComment";
import { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditPlatformCommentAtSummaryTransformer } from "../transformers/RedditPlatformCommentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformPostsPostIdComments(props: {
  postId: string & tags.Format<"uuid">;
  body: IRedditPlatformComment.IRequest;
}): Promise<IPageIRedditPlatformComment.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const sortBy = props.body.sortBy ?? "new";
  const orderByInput = (
    sortBy === "best"
      ? { vote_score: "desc" as const }
      : sortBy === "controversial"
        ? { vote_score: "asc" as const }
        : { created_at: "desc" as const }
  ) satisfies Prisma.reddit_platform_commentsOrderByWithRelationInput;
  const data = await MyGlobal.prisma.reddit_platform_comments.findMany({
    where: {
      post_id: props.postId,
      deleted_at: null,
    },
    skip,
    take: limit,
    orderBy: orderByInput,
    ...RedditPlatformCommentAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_platform_comments.count({
    where: {
      post_id: props.postId,
      deleted_at: null,
    },
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      RedditPlatformCommentAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: limit as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / limit) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    } satisfies IPage.IPagination,
  } as IPageIRedditPlatformComment.ISummary;
}
