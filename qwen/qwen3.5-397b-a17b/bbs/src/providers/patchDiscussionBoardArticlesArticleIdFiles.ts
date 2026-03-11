import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardArticleFileTransformer } from "../transformers/DiscussionBoardArticleFileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardArticlesArticleIdFiles(props: {
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleFile.IUpdate;
}): Promise<IDiscussionBoardArticleFile> {
  // Verify article exists and get owner information
  const article =
    await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
      where: { id: props.articleId },
      select: { id: true, discussion_board_member_id: true },
    });
  // Find the first active file attachment on the article
  const file =
    await MyGlobal.prisma.discussion_board_article_files.findFirstOrThrow({
      where: {
        discussion_board_article_id: props.articleId,
        deleted_at: null,
      },
      orderBy: { created_at: "asc" },
    });
  // Build update data from provided body fields
  const updateData: Prisma.discussion_board_article_filesUpdateInput = {
    ...(props.body.original_name !== undefined && {
      original_name: props.body.original_name,
    }),
    ...(props.body.deleted_at !== undefined && {
      deleted_at: props.body.deleted_at === null ? null : props.body.deleted_at,
    }),
    ...(props.body.updated_at !== undefined && {
      updated_at: props.body.updated_at,
    }),
  };
  // Apply the update
  await MyGlobal.prisma.discussion_board_article_files.update({
    where: { id: file.id },
    data: updateData,
  });
  // Fetch updated file with transformer selection
  const updated =
    await MyGlobal.prisma.discussion_board_article_files.findUniqueOrThrow({
      where: { id: file.id },
      ...DiscussionBoardArticleFileTransformer.select(),
    });
  // Transform and return
  return await DiscussionBoardArticleFileTransformer.transform(updated);
}
