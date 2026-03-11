import { IDiscussionBoardCommentActivityMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentActivityMetadatum";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function getDiscussionBoardAdminArticlesArticleIdCommentsCommentIdActivitiesActivityIdMetadataMetadataId(props: {
  admin: AdminPayload;
  articleId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  activityId: string & tags.Format<"uuid">;
  metadataId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardCommentActivityMetadatum> {
  // Step 1: Verify article exists and is accessible to admin
  await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
    where: {
      id: props.articleId,
      // Admin can access any article regardless of deletion status
    },
  });
  // Step 2: Verify comment exists and belongs to article
  await MyGlobal.prisma.discussion_board_comments.findUniqueOrThrow({
    where: {
      id: props.commentId,
      discussion_board_article_id: props.articleId,
      // Admin can access comments regardless of deletion status
    },
  });
  // Step 3: Verify activity exists and belongs to comment
  await MyGlobal.prisma.discussion_board_comment_activities.findUniqueOrThrow({
    where: {
      id: props.activityId,
      comment_id: props.commentId,
    },
  });
  // Step 4: Retrieve metadata with proper transformer selection
  const metadata =
    await MyGlobal.prisma.discussion_board_comment_activity_metadata.findUniqueOrThrow(
      {
        where: {
          id: props.metadataId,
          discussion_board_comment_activity_id: props.activityId,
        },
        ...DiscussionBoardCommentActivityMetadatumTransformer.select(),
      },
    );
  // Step 5: Transform and return
  return await DiscussionBoardCommentActivityMetadatumTransformer.transform(
    metadata,
  );
}
