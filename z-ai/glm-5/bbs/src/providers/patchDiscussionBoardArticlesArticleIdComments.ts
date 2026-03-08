import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardComment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardCommentAtSummaryTransformer } from "../transformers/DiscussionBoardCommentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardArticlesArticleIdComments(props: {
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardComment.IRequest;
}): Promise<IPageIDiscussionBoardComment.ISummary> {
  // Verify article exists and is not deleted
  await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
    where: {
      id: props.articleId,
      deleted_at: null,
    },
  });
  // Parse pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Parse sort parameter (default: created_at:asc - oldest first per requirements)
  const sortParts = (props.body.sort ?? "created_at:asc").split(":");
  const sortDirection = (sortParts[1] === "desc" ? "desc" : "asc") as
    | "asc"
    | "desc";
  // Build WHERE clause
  const whereInput = {
    discussion_board_article_id: props.articleId,
    deleted_at: null,
    ...(props.body.search && {
      content: { contains: props.body.search, mode: "insensitive" as const },
    }),
    ...(props.body.memberId && {
      discussion_board_member_id: props.body.memberId,
    }),
    ...(props.body.createdFrom || props.body.createdTo
      ? {
          created_at: {
            ...(props.body.createdFrom && {
              gte: new Date(props.body.createdFrom),
            }),
            ...(props.body.createdTo && {
              lte: new Date(props.body.createdTo),
            }),
          },
        }
      : {}),
  } satisfies Prisma.discussion_board_commentsWhereInput;
  // Query comments with transformer select
  const comments = await MyGlobal.prisma.discussion_board_comments.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: sortDirection },
    ...DiscussionBoardCommentAtSummaryTransformer.select(),
  });
  // Query total count
  const total = await MyGlobal.prisma.discussion_board_comments.count({
    where: whereInput,
  });
  // Transform results using ArrayUtil.asyncMap
  const data = await ArrayUtil.asyncMap(
    comments,
    DiscussionBoardCommentAtSummaryTransformer.transform,
  );
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIDiscussionBoardComment.ISummary;
}
