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
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { DiscussionBoardArticleFileTransformer } from "../transformers/DiscussionBoardArticleFileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardSuperAdminSectionsSectionIdFiles(props: {
  superAdmin: SuperAdminPayload;
  sectionId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleFile.ICreate;
}): Promise<IDiscussionBoardArticleFile> {
  // Validate section exists and superAdmin has access
  const section =
    await MyGlobal.prisma.discussion_board_sections.findUniqueOrThrow({
      where: {
        id: props.sectionId,
        deleted_at: null,
      },
      select: { id: true, name: true },
    });
  // Verify superAdmin has administrator privileges for this section
  const sectionAdmin =
    await MyGlobal.prisma.discussion_board_section_administrators.findFirst({
      where: {
        discussion_board_section_id: props.sectionId,
        discussion_board_admin_id: props.superAdmin.id,
        deleted_at: null,
      },
    });
  if (!sectionAdmin) {
    throw new HttpException(
      "SuperAdmin does not have administration privileges for this section",
      403,
    );
  }
  // Create a minimal article to attach the file to (as required by schema)
  const articleId = v4();
  const now = new Date().toISOString();
  const article = await MyGlobal.prisma.discussion_board_articles.create({
    data: {
      id: articleId,
      title: "File Attachment",
      content: "This article contains file attachments for the section.",
      status: "draft",
      discussion_board_section_id: props.sectionId,
      discussion_board_user_id: props.superAdmin.id,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    select: { id: true },
  });
  // Use collector to transform request DTO to database input
  const collectedData = await DiscussionBoardArticleFileCollector.collect({
    body: props.body,
    article: { id: article.id },
  });
  // Create the file attachment
  const createdFile =
    await MyGlobal.prisma.discussion_board_article_images.create({
      data: collectedData,
      ...DiscussionBoardArticleFileTransformer.select(),
    });
  // Transform database result to API response
  return await DiscussionBoardArticleFileTransformer.transform(createdFile);
}
