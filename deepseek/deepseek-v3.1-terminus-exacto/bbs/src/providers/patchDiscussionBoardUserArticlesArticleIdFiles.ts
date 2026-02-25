import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import { IDiscussionBoardAttachmentFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentFile";
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
import { DiscussionBoardArticleFileTransformer } from "../transformers/DiscussionBoardArticleFileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardUserArticlesArticleIdFiles(props: {
  user: UserPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleFile.IUpdate;
}): Promise<IDiscussionBoardArticleFile> {
  // Verify article exists and belongs to user
  const article =
    await MyGlobal.prisma.discussion_board_articles.findFirstOrThrow({
      where: {
        id: props.articleId,
        discussion_board_user_id: props.user.id,
        deleted_at: null,
      },
    });
  // Find the article image to update - need to determine which file to update
  // Operation specification says to update 'a specific article file attachment' but doesn't specify which file ID
  // This seems to be a design issue - PATCH should target a specific file, not all files for an article
  // Will implement update for the first image file associated with the article for now
  const imageToUpdate =
    await MyGlobal.prisma.discussion_board_article_images.findFirstOrThrow({
      where: {
        discussion_board_article_id: props.articleId,
        status: "active",
      },
      orderBy: {
        display_order: "asc",
      },
    });
  // Update the image metadata
  const updatedImage =
    await MyGlobal.prisma.discussion_board_article_images.update({
      where: { id: imageToUpdate.id },
      data: {
        display_order: props.body.display_order,
        alt_text: props.body.alt_text ?? null,
        caption: props.body.caption ?? null,
      },
      ...DiscussionBoardArticleFileTransformer.select(),
    });
  return await DiscussionBoardArticleFileTransformer.transform(updatedImage);
}
