import { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { DiscussionBoardArticleFileAtSummaryTransformer } from "../transformers/DiscussionBoardArticleFileAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdministratorArticlesArticleIdFiles(props: {
  superAdministrator: SuperadministratorPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleFile.IUpdate;
}): Promise<IDiscussionBoardArticleFile.ISummary> {
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId, deleted_at: null },
  });
  if (!article) {
    throw new HttpException("Article Not Found", 404);
  }
  // Assuming 'fileName' to identify a single file uniquely per article
  if (!props.body.fileName) {
    throw new HttpException(
      "File identification is required via fileName",
      400,
    );
  }
  const file = await MyGlobal.prisma.discussion_board_article_files.findFirst({
    where: {
      article_id: props.articleId,
      file_name: props.body.fileName,
      deleted_at: null,
    },
  });
  if (!file) {
    throw new HttpException(
      "File Not Found or does not belong to the article",
      404,
    );
  }
  // Compose update data omitting undefined
  const dataToUpdate = {
    ...(props.body.fileName !== undefined && {
      file_name: props.body.fileName,
    }),
    ...(props.body.fileType !== undefined && {
      file_type: props.body.fileType,
    }),
    ...(props.body.fileSize !== undefined && {
      file_size: props.body.fileSize,
    }),
    ...(props.body.downloadUrl !== undefined && {
      download_url: props.body.downloadUrl,
    }),
    ...(props.body.displayOrder !== undefined && {
      display_order: props.body.displayOrder,
    }),
    updated_at: toISOStringSafe(new Date()) as string &
      tags.Format<"date-time">,
  };
  await MyGlobal.prisma.discussion_board_article_files.update({
    where: { id: file.id },
    data: dataToUpdate,
  });
  const updatedFileWithRelation =
    await MyGlobal.prisma.discussion_board_article_files.findUnique({
      where: { id: file.id },
      include: { article: true },
    });
  if (!updatedFileWithRelation) {
    throw new HttpException("Updated file not found", 404);
  }
  return await DiscussionBoardArticleFileAtSummaryTransformer.transform(
    updatedFileWithRelation,
  );
}
