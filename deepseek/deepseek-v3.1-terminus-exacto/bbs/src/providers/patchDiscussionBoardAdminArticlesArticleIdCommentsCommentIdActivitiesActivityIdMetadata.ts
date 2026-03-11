import { IDiscussionBoardCommentActivityMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentActivityMetadatum";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardCommentActivityMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCommentActivityMetadatum";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardCommentActivityMetadatumTransformer } from "../transformers/DiscussionBoardCommentActivityMetadatumTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminArticlesArticleIdCommentsCommentIdActivitiesActivityIdMetadata(props: {
  admin: AdminPayload;
  articleId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  activityId: string & tags.Format<"uuid">;
  body: IDiscussionBoardCommentActivityMetadatum.IRequest;
}): Promise<IPageIDiscussionBoardCommentActivityMetadatum> {
  // 1. Pagination setup
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // 2. Hierarchical validation
  // Validate article exists
  await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
    where: { id: props.articleId },
  });
  // Validate comment exists and belongs to article
  await MyGlobal.prisma.discussion_board_comments.findUniqueOrThrow({
    where: {
      id: props.commentId,
      discussion_board_article_id: props.articleId,
    },
  });
  // Validate activity exists and belongs to comment
  await MyGlobal.prisma.discussion_board_comment_activities.findUniqueOrThrow({
    where: {
      id: props.activityId,
      comment_id: props.commentId,
    },
  });
  // 3. Build where clause for metadata
  const whereInput = {
    discussion_board_comment_activity_id: props.activityId,
    ...(props.body.key !== undefined && { key: props.body.key }),
    ...(props.body.value !== undefined && { value: props.body.value }),
    ...(props.body.created_after !== undefined && {
      created_at: { gte: props.body.created_after },
    }),
    ...(props.body.created_before !== undefined && {
      created_at: { lte: props.body.created_before },
    }),
  } satisfies Prisma.discussion_board_comment_activity_metadataWhereInput;
  // 4. Query metadata with pagination (sequential per pattern)
  const data =
    await MyGlobal.prisma.discussion_board_comment_activity_metadata.findMany({
      where: whereInput,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      ...DiscussionBoardCommentActivityMetadatumTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.discussion_board_comment_activity_metadata.count({
      where: whereInput,
    });
  // 5. Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardCommentActivityMetadatumTransformer.transform,
  );
  // 6. Return paginated response
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
