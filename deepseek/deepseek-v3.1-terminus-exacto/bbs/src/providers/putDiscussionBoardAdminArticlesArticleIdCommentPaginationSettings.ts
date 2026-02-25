import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardCommentPaginationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentPaginationSetting";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardCommentPaginationSettingTransformer } from "../transformers/DiscussionBoardCommentPaginationSettingTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardAdminArticlesArticleIdCommentPaginationSettings(props: {
  admin: AdminPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardCommentPaginationSetting.IUpdate;
}): Promise<IDiscussionBoardCommentPaginationSetting> {
  // 1. Verify article exists
  await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
    where: { id: props.articleId, deleted_at: null },
  });
  // 2. Check if pagination settings exist using discussion_board_article_id field (unique constraint)
  const existingSettings =
    await MyGlobal.prisma.discussion_board_comment_pagination_settings.findUnique(
      {
        where: { discussion_board_article_id: props.articleId },
      },
    );
  const now = new Date(Date.now());
  let result;
  if (existingSettings) {
    // 3a. Update existing settings
    const updateData: Prisma.discussion_board_comment_pagination_settingsUpdateInput =
      {
        updated_at: now,
        last_comment_count_update: now,
      };
    // Only update comments_per_page if provided
    if (props.body.comments_per_page !== undefined) {
      updateData.comments_per_page = props.body.comments_per_page;
    }
    result =
      await MyGlobal.prisma.discussion_board_comment_pagination_settings.update(
        {
          where: { id: existingSettings.id },
          data: updateData,
          ...DiscussionBoardCommentPaginationSettingTransformer.select(),
        },
      );
  } else {
    // 3b. Create new settings using article relation
    const commentsPerPage = props.body.comments_per_page ?? 50;
    // Get total comment count
    const totalCommentCount =
      await MyGlobal.prisma.discussion_board_comments.count({
        where: {
          article: { id: props.articleId },
          deleted_at: null,
        },
      });
    result =
      await MyGlobal.prisma.discussion_board_comment_pagination_settings.create(
        {
          data: {
            id: v4(),
            article: { connect: { id: props.articleId } },
            comments_per_page: commentsPerPage,
            total_comment_count: totalCommentCount,
            last_comment_count_update: now,
            created_at: now,
            updated_at: now,
          } satisfies Prisma.discussion_board_comment_pagination_settingsCreateInput,
          ...DiscussionBoardCommentPaginationSettingTransformer.select(),
        },
      );
  }
  // 4. Transform and return
  return await DiscussionBoardCommentPaginationSettingTransformer.transform(
    result,
  );
}
