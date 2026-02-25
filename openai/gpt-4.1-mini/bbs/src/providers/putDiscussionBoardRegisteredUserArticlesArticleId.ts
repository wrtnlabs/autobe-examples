import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RegistereduserPayload } from "../decorators/payload/RegistereduserPayload";
import { DiscussionBoardArticleTransformer } from "../transformers/DiscussionBoardArticleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardRegisteredUserArticlesArticleId(props: {
  registeredUser: RegistereduserPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticle.IUpdate;
}): Promise<IDiscussionBoardArticle> {
  // Step 1: Fetch existing article and ensure it exists
  const existingArticle =
    await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
      where: { id: props.articleId },
      select: {
        id: true,
        registered_user_id: true,
        deleted_at: true,
      },
    });
  // Step 2: Authorization check (owner or admin)
  if (existingArticle.registered_user_id !== props.registeredUser.id) {
    // Here, only article owner (registeredUser) allowed since admin context is missing
    throw new HttpException("Forbidden", 403);
  }
  // Step 3: Prepare update data object
  const currentISO = toISOStringSafe(new Date());
  const updateData: Prisma.discussion_board_articlesUpdateInput = {
    updated_at: currentISO,
  };
  if (props.body.title !== undefined) {
    updateData.title = props.body.title;
  }
  if (props.body.content !== undefined) {
    updateData.content = props.body.content;
  }
  if (props.body.sectionId !== undefined) {
    updateData.section = { connect: { id: props.body.sectionId } };
  }
  // Step 4: Perform update
  await MyGlobal.prisma.discussion_board_articles.update({
    where: { id: props.articleId },
    data: updateData,
  });
  // Step 5: Fetch updated article with full relations
  const updatedArticleRaw =
    await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
      where: { id: props.articleId },
      ...DiscussionBoardArticleTransformer.select(),
    });
  // Step 6: Transform and return
  return DiscussionBoardArticleTransformer.transform(updatedArticleRaw);
}
