import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
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
  member: import("../decorators/payload/MemberPayload").MemberPayload;

  body: IDiscussionBoardArticle.ICreate;
}): Promise<IDiscussionBoardArticle> {
  // Verify member exists and is not banned
  const member = await MyGlobal.prisma.discussion_board_members.findFirst({
    where: {
      id: props.member.id,
      deleted_at: null,
    },
  });
  if (member === null) {
    throw new HttpException("Member not found", 404);
  }
  if (member.ban_status !== "active") {
    throw new HttpException("You are banned from creating articles", 403);
  }
  // Verify section exists and is not deleted
  const section = await MyGlobal.prisma.discussion_board_sections.findFirst({
    where: {
      id: props.body.discussion_board_section_id,
      deleted_at: null,
    },
  });
  if (section === null) {
    throw new HttpException(
      "Target section does not exist or has been deleted",
      404,
    );
  }
  // Validate tags if provided
  if (props.body.tags && props.body.tags.length > 0) {
    const uniqueTags = Array.from(new Set(props.body.tags));
    const validTags = await MyGlobal.prisma.discussion_board_tags.findMany({
      where: {
        id: {
          in: uniqueTags,
        },
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
    if (validTags.length !== uniqueTags.length) {
      const validTagIds = new Set(validTags.map((t) => t.id));
      const invalidTags = uniqueTags.filter((id) => !validTagIds.has(id));
      throw new HttpException(
        `Tags do not exist: ${invalidTags.join(", ")}`,
        400,
      );
    }
  }
  // Create article with collector
  const created = await MyGlobal.prisma.discussion_board_articles.create({
    data: await DiscussionBoardArticleCollector.collect({
      body: props.body,
      discussionBoardMember: member,
      discussionBoardMemberSession: {
        id: props.member.session_id,
      },
    }),
    ...DiscussionBoardArticleTransformer.select(),
  });
  return await DiscussionBoardArticleTransformer.transform(created);
}
