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
import { DiscussionBoardArticleFileAtSummaryTransformer } from "../transformers/DiscussionBoardArticleFileAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardRegisteredUserArticlesArticleIdFiles(props: {
  registeredUser: RegistereduserPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleFile.IUpdate;
}): Promise<IDiscussionBoardArticleFile.ISummary> {
  const article =
    await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
      where: { id: props.articleId },
      select: { id: true, registered_user_id: true },
    });
  if (article.registered_user_id !== props.registeredUser.id) {
    const isAdmin =
      await MyGlobal.prisma.discussion_board_administrators.findUnique({
        where: { id: props.registeredUser.id },
        select: { id: true },
      });
    if (!isAdmin) {
      throw new HttpException("Forbidden", 403);
    }
  }
  const files = await MyGlobal.prisma.discussion_board_article_files.findMany({
    where: { article_id: props.articleId, deleted_at: null },
  });
  if (files.length === 0) {
    throw new HttpException("No files found for article", 404);
  }
  const updates = [];
  for (const file of files) {
    const updateData: Partial<typeof file> = {};
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
    if (Object.keys(updateData).length > 0) {
      updates.push(
        MyGlobal.prisma.discussion_board_article_files.update({
          where: { id: file.id },
          data: updateData,
        }),
      );
    }
  }
  await MyGlobal.prisma.$transaction(updates);
  const updatedFiles =
    await MyGlobal.prisma.discussion_board_article_files.findMany({
      where: { article_id: props.articleId, deleted_at: null },
      orderBy: { display_order: "asc" },
      include: { article: true },
    });
  if (updatedFiles.length === 0) {
    throw new HttpException("Updated files not found", 404);
  }
  // Pass date properties as Date objects, no conversion to string needed
  const transformed =
    await DiscussionBoardArticleFileAtSummaryTransformer.transform(
      updatedFiles[0],
    );
  return transformed;
}
