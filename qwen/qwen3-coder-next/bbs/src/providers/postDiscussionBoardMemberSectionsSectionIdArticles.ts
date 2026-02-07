import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardMemberSectionsSectionIdArticles(props: {
  member: MemberPayload;
  sectionId: string;
  body: IDiscussionBoardArticle.ICreate;
}): Promise<IDiscussionBoardArticle> {
  // Check if section exists
  const section = await MyGlobal.prisma.discussion_board_sections.findUnique({
    where: { id: props.sectionId },
  });
  if (!section) throw new HttpException("Section not found", 404);
  // Cast body to ensure type compatibility
  const safeBody = typia.assert<{
    title?: string;
    content?: string;
  }>(props.body);
  // Create article
  const created = await MyGlobal.prisma.discussion_board_articles.create({
    data: {
      id: v4(),
      author_id: props.member.id,
      section_id: props.sectionId,
      title: safeBody.title ?? "",
      content: safeBody.content ?? "",
      view_count: 0,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
  });
  // Return created article
  return {
    id: created.id,
    author_id: created.author_id,
    section_id: created.section_id,
    title: created.title,
    content: created.content,
    view_count: created.view_count,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
