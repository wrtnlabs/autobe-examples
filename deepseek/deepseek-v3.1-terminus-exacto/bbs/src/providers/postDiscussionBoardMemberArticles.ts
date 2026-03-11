import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardArticleCollector } from "../collectors/DiscussionBoardArticleCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { DiscussionBoardArticleTransformer } from "../transformers/DiscussionBoardArticleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardMemberArticles(props: {
  member: MemberPayload;
  body: IDiscussionBoardArticle.ICreate;
}): Promise<IDiscussionBoardArticle> {
  // Verify the specified section exists
  const section =
    await MyGlobal.prisma.discussion_board_sections.findUniqueOrThrow({
      where: { id: props.body.discussion_board_section_id },
    });
  // Check if section is active (not deleted)
  if (section.deleted_at !== null) {
    throw new HttpException("Section is not active", 400);
  }
  // Create the article using the collector
  const created = await MyGlobal.prisma.discussion_board_articles.create({
    data: await DiscussionBoardArticleCollector.collect({
      body: props.body,
      discussionBoardMembers: { id: props.member.id },
      discussionBoardMemberSessions: { id: props.member.session_id },
    }),
    ...DiscussionBoardArticleTransformer.select(),
  });
  // Transform and return the result
  return await DiscussionBoardArticleTransformer.transform(created);
}
