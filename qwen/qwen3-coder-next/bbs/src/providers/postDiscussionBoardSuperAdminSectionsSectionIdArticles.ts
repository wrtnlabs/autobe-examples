import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardSuperAdminSectionsSectionIdArticles(props: {
  superAdmin: SuperadminPayload;
  sectionId: string;
  body: IDiscussionBoardArticle.ICreate;
}): Promise<IDiscussionBoardArticle> {
  // Validate section exists
  const section = await MyGlobal.prisma.discussion_board_sections.findUnique({
    where: { id: props.sectionId },
  });
  if (!section) throw new HttpException("Section not found", 404);
  // Create article record with basic required fields
  const article = await MyGlobal.prisma.discussion_board_articles.create({
    data: {
      id: v4(),
      title: "", // Placeholder as ICreate doesn't have title
      content: "", // Placeholder as ICreate doesn't have content
      view_count: 0,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      author_id: props.superAdmin.id,
      section_id: props.sectionId,
    },
  });
  // Return created article with proper type conversion
  return {
    id: article.id,
    title: article.title,
    content: article.content,
    view_count: article.view_count,
    created_at: toISOStringSafe(article.created_at),
    updated_at: toISOStringSafe(article.updated_at),
    deleted_at: article.deleted_at ? toISOStringSafe(article.deleted_at) : null,
    author_id: article.author_id,
    section_id: article.section_id,
  };
}
