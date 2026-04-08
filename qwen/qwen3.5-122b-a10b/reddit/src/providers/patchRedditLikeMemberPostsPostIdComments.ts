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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditLikeCommentAtSummaryTransformer } from "../transformers/RedditLikeCommentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeMemberPostsPostIdComments(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditLikeComment.IRequest;
}): Promise<IPageIRedditLikeComment.ISummary> {
  await MyGlobal.prisma.reddit_like_posts.findUniqueOrThrow({
    where: { id: props.postId },
  });
  const page = props.body.page ?? 1;
  const limit = Math.min(Math.max(props.body.limit ?? 20, 1), 100);
  const skip = (page - 1) * limit;
  const whereInput = {
    reddit_like_post_id: props.postId,
    deleted_at: null,
  } satisfies Prisma.reddit_like_commentsWhereInput;
  const orderByInput = (() => {
    switch (props.body.sort) {
      case "best":
        return { created_at: "desc" as const };
      case "new":
        return { created_at: "desc" as const };
      case "controversial":
        return { created_at: "desc" as const };
      default:
        return { created_at: "desc" as const };
    }
  })() satisfies Prisma.reddit_like_commentsOrderByWithRelationInput;
  const records = await MyGlobal.prisma.reddit_like_comments.findMany({
    ...RedditLikeCommentAtSummaryTransformer.select(),
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
  });
  const total = await MyGlobal.prisma.reddit_like_comments.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await RedditLikeCommentAtSummaryTransformer.transformAll(records),
  };
}
