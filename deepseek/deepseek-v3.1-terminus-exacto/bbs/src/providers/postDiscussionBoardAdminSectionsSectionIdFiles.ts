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
import { DiscussionBoardArticleFileCollector } from "../collectors/DiscussionBoardArticleFileCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardArticleFileTransformer } from "../transformers/DiscussionBoardArticleFileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardAdminSectionsSectionIdFiles(props: {
  admin: AdminPayload;
  sectionId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleFile.ICreate;
}): Promise<IDiscussionBoardArticleFile> {
  // Verify section exists and admin has permission
  const section = await MyGlobal.prisma.discussion_board_sections.findFirst({
    where: {
      id: props.sectionId,
      deleted_at: null,
    },
  });
  if (!section) {
    throw new HttpException("Section not found", 404);
  }
  // Create a new article entity to associate the file
  const article = await MyGlobal.prisma.discussion_board_articles.create({
    data: {
      id: v4(),
      title: "Section attachment",
      status: "draft",
      content: "", // Adding required content field
      section: { connect: { id: props.sectionId } },
      author: { connect: { id: props.admin.id } },
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
  });
  // Create file attachment using collector
  const createdFile =
    await MyGlobal.prisma.discussion_board_article_images.create({
      data: await DiscussionBoardArticleFileCollector.collect({
        body: props.body,
        article: article,
      }),
    });
  // Return transformed response
  const fileWithRelations =
    await MyGlobal.prisma.discussion_board_article_images.findUniqueOrThrow({
      where: { id: createdFile.id },
      ...DiscussionBoardArticleFileTransformer.select(),
    });
  return await DiscussionBoardArticleFileTransformer.transform(
    fileWithRelations,
  );
}
