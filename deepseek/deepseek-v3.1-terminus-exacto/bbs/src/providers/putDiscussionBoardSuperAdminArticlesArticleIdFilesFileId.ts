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
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { DiscussionBoardArticleFileTransformer } from "../transformers/DiscussionBoardArticleFileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardSuperAdminArticlesArticleIdFilesFileId(props: {
  superAdmin: SuperAdminPayload;
  articleId: string & tags.Format<"uuid">;
  fileId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleFile.IUpdate;
}): Promise<IDiscussionBoardArticleFile> {
  // Verify the file exists and belongs to the specified article
  const existingFile =
    await MyGlobal.prisma.discussion_board_article_images.findUniqueOrThrow({
      where: {
        id: props.fileId,
        discussion_board_article_id: props.articleId,
      },
    });
  // Update the file metadata with the provided values
  await MyGlobal.prisma.discussion_board_article_images.update({
    where: { id: props.fileId },
    data: {
      display_order: props.body.display_order,
      alt_text:
        props.body.alt_text !== undefined
          ? props.body.alt_text
          : existingFile.alt_text,
      caption:
        props.body.caption !== undefined
          ? props.body.caption
          : existingFile.caption,
    },
  });
  // Fetch the updated record with all relations for transformation
  const updatedFile =
    await MyGlobal.prisma.discussion_board_article_images.findUniqueOrThrow({
      where: { id: props.fileId },
      ...DiscussionBoardArticleFileTransformer.select(),
    });
  return await DiscussionBoardArticleFileTransformer.transform(updatedFile);
}
