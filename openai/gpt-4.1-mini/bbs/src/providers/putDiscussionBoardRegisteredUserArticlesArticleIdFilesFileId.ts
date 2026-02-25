import { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RegistereduserPayload } from "../decorators/payload/RegistereduserPayload";
import { DiscussionBoardArticleFileTransformer } from "../transformers/DiscussionBoardArticleFileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardRegisteredUserArticlesArticleIdFilesFileId(props: {
  registeredUser: RegistereduserPayload;
  articleId: string & tags.Format<"uuid">;
  fileId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleFile.IUpdate;
}): Promise<IDiscussionBoardArticleFile> {
  const file = await MyGlobal.prisma.discussion_board_article_files.findUnique({
    where: { id: props.fileId },
    select: {
      id: true,
      article_id: true,
    },
  });
  if (!file || file.article_id !== props.articleId) {
    throw new HttpException(
      "File not found or does not belong to the article",
      404,
    );
  }
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId },
    select: {
      id: true,
      registered_user_id: true,
    },
  });
  if (!article) {
    throw new HttpException("Article not found", 404);
  }
  if (article.registered_user_id !== props.registeredUser.id) {
    throw new HttpException("Forbidden", 403);
  }
  const updateData: {
    file_name?: string;
    file_type?: string;
    file_size?: number;
    download_url?: string;
    display_order?: number;
    updated_at: string & tags.Format<"date-time">;
  } = {
    updated_at: new Date().toISOString() as string & tags.Format<"date-time">,
  };
  if (props.body.fileName !== undefined)
    updateData.file_name = props.body.fileName;
  if (props.body.fileType !== undefined)
    updateData.file_type = props.body.fileType;
  if (props.body.fileSize !== undefined)
    updateData.file_size = props.body.fileSize;
  if (props.body.downloadUrl !== undefined)
    updateData.download_url = props.body.downloadUrl;
  if (props.body.displayOrder !== undefined)
    updateData.display_order = props.body.displayOrder;
  const updatedFile =
    await MyGlobal.prisma.discussion_board_article_files.update({
      where: { id: props.fileId },
      data: updateData,
      ...DiscussionBoardArticleFileTransformer.select(),
    });
  return await DiscussionBoardArticleFileTransformer.transform(updatedFile);
}
