import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPolDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardArticle";
import { IEconPolDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardAttachment";
import { IEconPolDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardMember";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function putEconPolDiscussionBoardMemberArticlesId(props: {
  member: MemberPayload;
  id: string & tags.Format<"uuid">;
  body: IEconPolDiscussionBoardArticle.IUpdate;
}): Promise<IEconPolDiscussionBoardArticle> {
  // Verify existence of article and ownership
  const existing =
    await MyGlobal.prisma.econ_pol_discussion_board_articles.findUnique({
      where: { id: props.id },
    });

  if (!existing) {
    throw new HttpException("Article not found", 404);
  }

  if (existing.econ_pol_discussion_board_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }

  // Perform update in transaction
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Delete existing attachments
    await tx.econ_pol_discussion_board_attachments.deleteMany({
      where: { econ_pol_discussion_board_article_id: props.id },
    });

    // Create new attachments
    await tx.econ_pol_discussion_board_attachments.createMany({
      data: props.body.attachments.map((attachment) => ({
        id: v4(),
        econ_pol_discussion_board_article_id: props.id,
        type: attachment.type,
        url: attachment.url,
        file_name: attachment.fileName,
        uploaded_at: toISOStringSafe(new Date()),
      })),
    });

    // Update article
    await tx.econ_pol_discussion_board_articles.update({
      where: { id: props.id },
      data: {
        title: props.body.title,
        content: props.body.content,
        updated_at: toISOStringSafe(new Date()),
      },
    });
  });

  // Retrieve updated article
  const article =
    await MyGlobal.prisma.econ_pol_discussion_board_articles.findUnique({
      where: { id: props.id },
    });

  if (!article) {
    throw new HttpException("Article not found after update", 404);
  }

  // Fetch author separately via member_id with select projection including available fields
  const author =
    await MyGlobal.prisma.econ_pol_discussion_board_members.findUnique({
      where: { id: article.econ_pol_discussion_board_member_id },
      select: {
        id: true,
        username: true,
        created_at: true,
      },
    });

  if (!author) {
    throw new HttpException("Author member not found", 404);
  }

  const authorSummary: IEconPolDiscussionBoardMember.ISummary = {
    id: author.id,
    username: author.username,
    displayName: author.username, // No display_name property, fallback to username
    avatarUrl: undefined, // No avatar_url property
    memberSince: toISOStringSafe(author.created_at),
  };

  return {
    id: article.id,
    title: article.title,
    content: article.content,
    author: authorSummary,
    created_at: toISOStringSafe(article.created_at),
    updated_at: toISOStringSafe(article.updated_at),
  };
}
