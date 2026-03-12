import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
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
  const section = await MyGlobal.prisma.discussion_board_sections.findUnique({
    where: { id: props.body.section_id },
    select: { id: true, deleted_at: true },
  });
  if (section === null || section.deleted_at !== null) {
    throw new HttpException("Section not found or deleted", 404);
  }
  const created = await MyGlobal.prisma.discussion_board_articles.create({
    data: await DiscussionBoardArticleCollector.collect({
      body: props.body,
      discussionBoardMembers: { id: props.member.id } satisfies IEntity,
      discussionBoardMemberSessions: {
        id: props.member.session_id,
      } satisfies IEntity,
    }),
    ...DiscussionBoardArticleTransformer.select(),
  });
  return await DiscussionBoardArticleTransformer.transform(created);
}
