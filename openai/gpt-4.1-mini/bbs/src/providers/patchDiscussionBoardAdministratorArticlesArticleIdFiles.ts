import { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { DiscussionBoardArticleFileAtSummaryTransformer } from "../transformers/DiscussionBoardArticleFileAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdministratorArticlesArticleIdFiles(props: {
  administrator: AdministratorPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleFile.IUpdate;
}): Promise<IDiscussionBoardArticleFile.ISummary> {
  // Validate article existence
  await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
    where: { id: props.articleId },
    select: { id: true },
  });
  // Fetch all live files for the article
  const files = await MyGlobal.prisma.discussion_board_article_files.findMany({
    where: { article_id: props.articleId, deleted_at: null },
  });
  if (files.length === 0) {
    throw new HttpException("No files found for article", 404);
  }
  // Update all files with the given fields
  await MyGlobal.prisma.$transaction(
    files.map((file) => {
      const dataToUpdate: Partial<Prisma.discussion_board_article_filesUpdateInput> =
        {};
      if (props.body.fileName !== undefined)
        dataToUpdate.file_name = props.body.fileName;
      if (props.body.fileType !== undefined)
        dataToUpdate.file_type = props.body.fileType;
      if (props.body.fileSize !== undefined)
        dataToUpdate.file_size = props.body.fileSize;
      if (props.body.downloadUrl !== undefined)
        dataToUpdate.download_url = props.body.downloadUrl;
      if (props.body.displayOrder !== undefined)
        dataToUpdate.display_order = props.body.displayOrder;
      return MyGlobal.prisma.discussion_board_article_files.update({
        where: { id: file.id },
        data: dataToUpdate,
      });
    }),
  );
  // Fetch first updated file with related article included
  const firstUpdatedRaw =
    await MyGlobal.prisma.discussion_board_article_files.findFirstOrThrow({
      where: { article_id: props.articleId, deleted_at: null },
      include: { article: true },
    });
  // Transform dates to string & tags.Format<'date-time'> before passing
  const firstUpdated = {
    ...firstUpdatedRaw,
    created_at: toISOStringSafe(firstUpdatedRaw.created_at),
    updated_at: toISOStringSafe(firstUpdatedRaw.updated_at),
    deleted_at: firstUpdatedRaw.deleted_at
      ? toISOStringSafe(firstUpdatedRaw.deleted_at)
      : null,
  };
  // Transform and return
  return await DiscussionBoardArticleFileAtSummaryTransformer.transform(
    firstUpdated as unknown as typeof firstUpdatedRaw,
  );
}
