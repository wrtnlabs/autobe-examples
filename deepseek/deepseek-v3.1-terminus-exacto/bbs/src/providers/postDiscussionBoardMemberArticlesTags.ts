import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
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
import { DiscussionBoardArticleTagCollector } from "../collectors/DiscussionBoardArticleTagCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { DiscussionBoardArticleTagTransformer } from "../transformers/DiscussionBoardArticleTagTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardMemberArticlesTags(props: {
  member: MemberPayload;
  body: IDiscussionBoardArticleTag.ICreate;
}): Promise<IDiscussionBoardArticleTag> {
  // First, validate the article exists and belongs to the current member
  const article =
    await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
      where: {
        id: props.body.discussion_board_article_id,
        discussion_board_member_id: props.member.id,
        deleted_at: null,
      },
      select: {
        id: true,
        discussion_board_member_id: true,
      },
    });
  // Check ownership
  if (article.discussion_board_member_id !== props.member.id) {
    throw new HttpException("You can only tag your own articles", 403);
  }
  // Use the collector to create database input
  const data = await DiscussionBoardArticleTagCollector.collect({
    body: props.body,
    discussionBoardMembers: { id: props.member.id } as IEntity,
    discussionBoardMemberSessions: { id: props.member.session_id } as IEntity,
  });
  // Create the article-tag association
  const created = await MyGlobal.prisma.discussion_board_article_tags.create({
    data: data,
    ...DiscussionBoardArticleTagTransformer.select(),
  });
  // Transform the result to DTO
  return await DiscussionBoardArticleTagTransformer.transform(created);
}
