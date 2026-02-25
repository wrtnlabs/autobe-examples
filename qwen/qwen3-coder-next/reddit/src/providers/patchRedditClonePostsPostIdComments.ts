import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCloneContentComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneContentComment";
import { IRedditCloneContentComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentComment";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCloneContentCommentTransformer } from "../transformers/RedditCloneContentCommentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditClonePostsPostIdComments(props: {
  postId: string;
  body: IRedditCloneContentComment.IRequest;
}): Promise<IPageIRedditCloneContentComment> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const algorithm = props.body.algorithm;
  let orderBy: Prisma.reddit_clone_content_commentsOrderByWithRelationInput;
  switch (algorithm) {
    case "hot":
      orderBy = { vote_score: "desc", created_at: "desc" };
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
        reply_count: "desc",
      };
      break;
    default:
      orderBy = { created_at: "desc" };
  }
  const where: Prisma.reddit_clone_content_commentsWhereInput = {
    post_id: props.postId,
    parent_comment_id: null,
    deleted_at: null,
  };
  const data = await MyGlobal.prisma.reddit_clone_content_comments.findMany({
    where,
    orderBy,
    skip,
    take: limit,
    ...RedditCloneContentCommentTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_clone_content_comments.count({
    where: {
      post_id: props.postId,
      parent_comment_id: null,
      deleted_at: null,
    },
  });
  const transformedData = await ArrayUtil.asyncMap(
    data,
    RedditCloneContentCommentTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIRedditCloneContentComment;
}
