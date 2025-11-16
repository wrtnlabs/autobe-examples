import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPolDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardComment";
import { IEconPolDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardArticle";
import { IEconPolDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardMember";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postEconPolDiscussionBoardMemberEconPolDiscussionBoardComments(props: {
  member: MemberPayload;
  econPolDiscussionBoardArticleId: string & tags.Format<"uuid">;
  econPolDiscussionBoardMemberId: string & tags.Format<"uuid">;
  body: IEconPolDiscussionBoardComment.ICreate;
}): Promise<IEconPolDiscussionBoardComment> {
  const article =
    await MyGlobal.prisma.econ_pol_discussion_board_articles.findUnique({
      where: { id: props.econPolDiscussionBoardArticleId },
    });

  if (!article) {
    throw new HttpException("Article not found", 404);
  }

  if (props.econPolDiscussionBoardMemberId !== props.member.id) {
    throw new HttpException("Member ID mismatch", 403);
  }

  const member =
    await MyGlobal.prisma.econ_pol_discussion_board_members.findUnique({
      where: { id: props.econPolDiscussionBoardMemberId },
    });

  if (!member) {
    throw new HttpException("Member not found", 404);
  }

  const created =
    await MyGlobal.prisma.econ_pol_discussion_board_comments.create({
      data: {
        id: v4() satisfies string as string,
        econ_pol_discussion_board_article_id:
          props.econPolDiscussionBoardArticleId satisfies string as string,
        econ_pol_discussion_board_member_id:
          props.econPolDiscussionBoardMemberId satisfies string as string,
        parent_comment_id: props.body.parentCommentId ?? undefined,
        body: props.body.body,
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
      },
    });

  return {
    id: created.id,
    article: {
      id: article.id,
      title: article.title,
      author: {
        id: member.id,
        username: member.username,
        displayName: member.username,
        avatarUrl: null,
        memberSince: toISOStringSafe(member.created_at),
      },
      created_at: toISOStringSafe(article.created_at),
      updated_at: toISOStringSafe(article.updated_at),
    },
    author: {
      id: member.id,
      username: member.username,
      displayName: member.username,
      avatarUrl: null,
      memberSince: toISOStringSafe(member.created_at),
    },
    parent_id: created.parent_comment_id ?? undefined,
    body: created.body,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
