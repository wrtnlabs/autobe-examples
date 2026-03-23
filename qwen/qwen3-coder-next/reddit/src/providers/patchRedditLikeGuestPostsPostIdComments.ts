import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeComment";
import { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { RedditLikeCommentAtSummaryTransformer } from "../transformers/RedditLikeCommentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeGuestPostsPostIdComments(props: {
  guest: GuestPayload;
  postId: string;
  body: IRedditLikeComment.IRequest;
}): Promise<IPageIRedditLikeComment.ISummary> {
  const { limit = 20, offset = 0, sort = "best" } = props.body;
  const skip = offset;
  const whereInput: Prisma.reddit_like_commentsWhereInput = {
    post_id: props.postId,
    deleted_at: null,
  };
  const orderByInput: Prisma.reddit_like_commentsOrderByWithRelationInput =
    sort === "new"
      ? { created_at: "desc" }
      : sort === "controversial"
        ? { vote_score: "desc", created_at: "asc" }
        : { vote_score: "desc", created_at: "desc" };
  const data = await MyGlobal.prisma.reddit_like_comments.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...RedditLikeCommentAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_like_comments.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      RedditLikeCommentAtSummaryTransformer.transform,
    ),
    pagination: {
      current: Math.floor(skip / limit) + 1,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
