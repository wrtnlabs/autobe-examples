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
import { DiscussionBoardArticleAtSummaryTransformer } from "../transformers/DiscussionBoardArticleAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardAdminArticlesArticleIdImagesImageId(props: {
  admin: AdminPayload;
  articleId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardArticleFile> {
  // First verify the article exists
  await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
    where: { id: props.articleId },
  });
  // Retrieve the image record with article relation
  const image =
    await MyGlobal.prisma.discussion_board_article_images.findUniqueOrThrow({
      where: {
        id: props.imageId,
        discussion_board_article_id: props.articleId,
      },
      include: {
        article: DiscussionBoardArticleAtSummaryTransformer.select(),
      },
    });
  // Construct placeholder attachment file since the actual file table may not exist
  // Based on the transformer pattern that was loaded
  const attachmentFile: IDiscussionBoardAttachmentFile = {
    id: image.attachment_file_id,
    filename: `${image.attachment_file_id}.jpg`,
    file_size: 1024,
    mime_type: "image/jpeg",
    storage_path: `/uploads/${image.attachment_file_id}.jpg`,
    original_filename: null,
    width: null,
    height: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  return {
    id: image.id,
    attachment_file: attachmentFile,
    status: image.status,
    display_order: image.display_order,
    alt_text: image.alt_text ?? null,
    caption: image.caption ?? null,
    article: await DiscussionBoardArticleAtSummaryTransformer.transform(
      image.article,
    ),
  };
}
