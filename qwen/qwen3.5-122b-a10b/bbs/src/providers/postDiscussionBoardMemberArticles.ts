import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
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
  // Validate section exists and is not soft-deleted
  const section = await MyGlobal.prisma.discussion_board_sections.findUnique({
    where: { id: props.body.discussion_board_section_id },
  });
  if (section === null || section.deleted_at !== null) {
    throw new HttpException("Section not found", 404);
  }
  // Validate tags if provided
  if (props.body.tagIds && props.body.tagIds.length > 0) {
    const uniqueTagIds = Array.from(new Set(props.body.tagIds));
    const existingTags = await MyGlobal.prisma.discussion_board_tags.findMany({
      where: {
        id: { in: uniqueTagIds },
        deleted_at: null,
      },
    });
    if (existingTags.length !== uniqueTagIds.length) {
      throw new HttpException("One or more tags not found", 404);
    }
  }
  // Create article using collector
  const created = await MyGlobal.prisma.discussion_board_articles.create({
    data: await DiscussionBoardArticleCollector.collect({
      body: props.body,
      discussionBoardMembers: { id: props.member.id },
    }),
    ...DiscussionBoardArticleTransformer.select(),
  } satisfies Prisma.discussion_board_articlesCreateArgs);
  return await DiscussionBoardArticleTransformer.transform(created);
}
