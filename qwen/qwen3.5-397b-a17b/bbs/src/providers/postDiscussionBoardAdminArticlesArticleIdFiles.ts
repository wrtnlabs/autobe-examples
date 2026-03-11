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
import { DiscussionBoardArticleFileCollector } from "../collectors/DiscussionBoardArticleFileCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardArticleFileTransformer } from "../transformers/DiscussionBoardArticleFileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardAdminArticlesArticleIdFiles(props: {
  admin: AdminPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleFile.ICreate;
}): Promise<IDiscussionBoardArticleFile> {
  // Validate article exists and is not deleted
  await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
    where: {
      id: props.articleId,
      deleted_at: null,
    },
  });
  // Get the member record associated with this admin
  const member =
    await MyGlobal.prisma.discussion_board_members.findUniqueOrThrow({
      where: {
        id: props.admin.id,
        deleted_at: null,
      },
    });
  // Create file attachment using collector
  const created = await MyGlobal.prisma.discussion_board_article_files.create({
    data: await DiscussionBoardArticleFileCollector.collect({
      body: props.body,
      article: { id: props.articleId },
      member: { id: member.id },
    }),
    ...DiscussionBoardArticleFileTransformer.select(),
  });
  // Transform to response DTO
  return await DiscussionBoardArticleFileTransformer.transform(created);
}
