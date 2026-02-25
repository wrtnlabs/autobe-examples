import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
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
import { UserPayload } from "../decorators/payload/UserPayload";
import { DiscussionBoardArticleTransformer } from "../transformers/DiscussionBoardArticleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardUserArticlesArticleId(props: {
  user: UserPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticle.IUpdate;
}): Promise<IDiscussionBoardArticle> {
  // 1. Verify article exists and is not deleted
  const article =
    await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
      where: { id: props.articleId, deleted_at: null },
    });
  // 2. Authorization check - user must be author or admin
  if (article.discussion_board_user_id !== props.user.id) {
    const adminRecord =
      await MyGlobal.prisma.discussion_board_administrators.findUnique({
        where: { id: props.user.id, deleted_at: null },
      });
    if (!adminRecord) {
      throw new HttpException("You can only update your own articles", 403);
    }
  }
  // 3. Field validation for provided fields
  if (props.body.title !== undefined) {
    if (props.body.title.length < 5 || props.body.title.length > 200) {
      throw new HttpException(
        "Title must be between 5 and 200 characters",
        400,
      );
    }
  }
  if (props.body.content !== undefined) {
    if (props.body.content.length < 50) {
      throw new HttpException("Content must be at least 50 characters", 400);
    }
  }
  if (props.body.status !== undefined) {
    const validStatuses = ["draft", "published", "archived"];
    if (!validStatuses.includes(props.body.status)) {
      throw new HttpException(
        "Status must be one of: draft, published, archived",
        400,
      );
    }
  }
  // 4. Prepare update data
  const updateData: Prisma.discussion_board_articlesUpdateInput = {
    updated_at: new Date(),
  };
  if (props.body.title !== undefined) updateData.title = props.body.title;
  if (props.body.content !== undefined) updateData.content = props.body.content;
  if (props.body.status !== undefined) updateData.status = props.body.status;
  // 5. Perform update
  await MyGlobal.prisma.discussion_board_articles.update({
    where: { id: props.articleId },
    data: updateData,
  });
  // 6. Fetch updated article with transformer
  const updatedArticle =
    await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
      where: { id: props.articleId },
      ...DiscussionBoardArticleTransformer.select(),
    });
  // 7. Return transformed article
  return DiscussionBoardArticleTransformer.transform(updatedArticle);
}
