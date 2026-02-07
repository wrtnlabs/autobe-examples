import { IDiscussionBoardCommentPaginationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentPaginationSetting";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardCommentPaginationSettingTransformer } from "../transformers/DiscussionBoardCommentPaginationSettingTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardSuperAdminArticlesArticleIdCommentPaginationSettings(props: {
  superAdmin: SuperadminPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardCommentPaginationSetting.IUpdate;
}): Promise<IDiscussionBoardCommentPaginationSetting> {
  // Verify article exists
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId },
  });
  if (!article) {
    throw new HttpException("Article not found", 404);
  }
  // Find existing pagination settings
  const existingSettings =
    await MyGlobal.prisma.discussion_board_comment_pagination_settings.findUnique(
      {
        where: { discussion_board_article_id: props.articleId },
        ...DiscussionBoardCommentPaginationSettingTransformer.select(),
      },
    );
  if (!existingSettings) {
    throw new HttpException(
      "Comment pagination settings not found for this article",
      404,
    );
  }
  // Prepare update data
  const updateData: Prisma.discussion_board_comment_pagination_settingsUpdateInput =
    {
      updated_at: toISOStringSafe(new Date()),
    };
  // Update comments_per_page if provided
  if (props.body.comments_per_page !== undefined) {
    if (
      props.body.comments_per_page < 1 ||
      props.body.comments_per_page > 100
    ) {
      throw new HttpException(
        "comments_per_page must be between 1 and 100",
        400,
      );
    }
    updateData.comments_per_page = props.body.comments_per_page;
  }
  // Update total_comment_count if provided
  if (props.body.total_comment_count !== undefined) {
    if (props.body.total_comment_count < 0) {
      throw new HttpException("total_comment_count must be non-negative", 400);
    }
    updateData.total_comment_count = props.body.total_comment_count;
    updateData.last_comment_count_update = toISOStringSafe(new Date());
  }
  // Update the settings
  const updatedSettings =
    await MyGlobal.prisma.discussion_board_comment_pagination_settings.update({
      where: { id: existingSettings.id },
      data: updateData,
      ...DiscussionBoardCommentPaginationSettingTransformer.select(),
    });
  return await DiscussionBoardCommentPaginationSettingTransformer.transform(
    updatedSettings,
  );
}
