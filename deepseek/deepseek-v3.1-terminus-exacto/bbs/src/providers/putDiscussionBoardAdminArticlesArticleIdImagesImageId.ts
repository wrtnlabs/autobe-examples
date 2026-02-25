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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardArticleFileTransformer } from "../transformers/DiscussionBoardArticleFileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardAdminArticlesArticleIdImagesImageId(props: {
  admin: AdminPayload;
  articleId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleFile.IUpdate;
}): Promise<IDiscussionBoardArticleFile> {
  // 1. Validate admin has access to article's section
  const article =
    await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
      where: { id: props.articleId },
      select: { discussion_board_section_id: true },
    });
  const sectionAdmin =
    await MyGlobal.prisma.discussion_board_section_administrators.findFirst({
      where: {
        discussion_board_admin_id: props.admin.id,
        discussion_board_section_id: article.discussion_board_section_id,
        deleted_at: null,
      },
    });
  if (!sectionAdmin) {
    throw new HttpException("Forbidden", 403);
  }
  // 2. Validate image exists and belongs to article
  const existingImage =
    await MyGlobal.prisma.discussion_board_article_images.findUniqueOrThrow({
      where: {
        id: props.imageId,
        discussion_board_article_id: props.articleId,
      },
    });
  // 3. Ensure display_order uniqueness if being updated
  if (
    props.body.display_order !== undefined &&
    props.body.display_order !== existingImage.display_order
  ) {
    const conflictingImage =
      await MyGlobal.prisma.discussion_board_article_images.findFirst({
        where: {
          discussion_board_article_id: props.articleId,
          display_order: props.body.display_order,
          id: { not: props.imageId },
        },
      });
    if (conflictingImage) {
      throw new HttpException(
        "Display order already exists for this article",
        400,
      );
    }
  }
  // 4. Update image metadata
  await MyGlobal.prisma.discussion_board_article_images.update({
    where: { id: props.imageId },
    data: {
      ...(props.body.display_order !== undefined && {
        display_order: props.body.display_order,
      }),
      ...(props.body.alt_text !== undefined && {
        alt_text: props.body.alt_text,
      }),
      ...(props.body.caption !== undefined && { caption: props.body.caption }),
    },
  });
  // 5. Retrieve updated record with transformer
  const updatedImage =
    await MyGlobal.prisma.discussion_board_article_images.findUniqueOrThrow({
      where: { id: props.imageId },
      ...DiscussionBoardArticleFileTransformer.select(),
    });
  return await DiscussionBoardArticleFileTransformer.transform(updatedImage);
}
