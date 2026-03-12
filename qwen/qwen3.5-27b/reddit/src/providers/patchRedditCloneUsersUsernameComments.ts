import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneComment";
import { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
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
import { RedditCloneCommentAtSummaryTransformer } from "../transformers/RedditCloneCommentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneUsersUsernameComments(props: {
  username: string;
  body: IRedditCloneComment.IRequest;
}): Promise<IPageIRedditCloneComment.ISummary> {
  const member = await MyGlobal.prisma.reddit_clone_members.findUniqueOrThrow({
    where: {
      username: props.username,
      deleted_at: null,
    },
  });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.reddit_clone_commentsWhereInput = {
    reddit_clone_member_id: member.id,
    deleted_at: null,
  };
  if (props.body.postId) {
    whereInput.reddit_clone_post_id = props.body.postId;
  }
  if (props.body.search) {
    whereInput.content = {
      contains: props.body.search,
    };
  }
  const sortField = props.body.sort ?? "created_at";
  const sortOrder = props.body.order ?? "desc";
  const orderByInput: Prisma.reddit_clone_commentsOrderByWithRelationInput =
    sortField === "score"
      ? { score: sortOrder as "asc" | "desc" }
      : sortField === "updated_at"
        ? { updated_at: sortOrder as "asc" | "desc" }
        : { created_at: sortOrder as "asc" | "desc" };
  const data = await MyGlobal.prisma.reddit_clone_comments.findMany({
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
    data: await ArrayUtil.asyncMap(
      data,
      RedditCloneCommentAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
