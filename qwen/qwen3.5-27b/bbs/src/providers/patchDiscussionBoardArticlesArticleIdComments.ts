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
  // Verify article exists and is not soft-deleted
  await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
    where: {
      id: props.articleId,
      deleted_at: null,
    },
  });
  // Build pagination parameters
  const page = props.body.page ?? 1;
  const pageSize = props.body.pageSize ?? 20;
  const skip = (page - 1) * pageSize;
  const take = pageSize;
  // Build where clause
  const whereInput: Prisma.discussion_board_commentsWhereInput = {
    discussion_board_article_id: props.articleId,
    deleted_at: null,
    ...(props.body.search && {
      content: {
        contains: props.body.search,
      },
    }),
    ...(props.body.authorId && {
      discussion_board_member_id: props.body.authorId,
    }),
    ...(props.body.createdAtFrom && {
      created_at: {
        gte: new Date(props.body.createdAtFrom),
      },
    }),
    ...(props.body.createdAtTo && {
      created_at: {
        lte: new Date(props.body.createdAtTo),
      },
    }),
  };
  // Build orderBy clause
  const sortBy = props.body.sortBy ?? "createdAt";
  const sortOrder = props.body.sortOrder ?? "asc";
  const orderByInput: Prisma.discussion_board_commentsOrderByWithRelationInput =
    sortBy === "updatedAt"
      ? { updated_at: sortOrder }
      : { created_at: sortOrder };
  // Fetch comments with pagination
  const data = await MyGlobal.prisma.discussion_board_comments.findMany({
    where: whereInput,
    skip,
    take,
    orderBy: orderByInput,
    ...DiscussionBoardCommentAtSummaryTransformer.select(),
  });
  // Get total count
  const total = await MyGlobal.prisma.discussion_board_comments.count({
    where: whereInput,
  });
  // Transform and return paginated result
  return {
    pagination: {
      current: page,
      limit: pageSize,
      records: total,
      pages: Math.ceil(total / pageSize),
    },
    data: await ArrayUtil.asyncMap(
      data,
      DiscussionBoardCommentAtSummaryTransformer.transform,
    ),
  };
}
