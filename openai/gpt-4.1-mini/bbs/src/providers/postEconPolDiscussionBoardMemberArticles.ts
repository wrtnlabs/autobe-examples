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

export async function postEconPolDiscussionBoardMemberArticles(props: {
  member: MemberPayload;
  body: IEconPolDiscussionBoardArticle.ICreate;
}): Promise<IEconPolDiscussionBoardArticle> {
  // Generate new UUID for article
  const articleId = v4();

  // Get current ISO datetime string
  const now = toISOStringSafe(new Date());

  // Create the article and any attachments in a transaction
  const createResult = await MyGlobal.prisma.$transaction(async (tx) => {
    // Create article
    const createdArticle = await tx.econ_pol_discussion_board_articles.create({
      data: {
        id: articleId,
        econ_pol_discussion_board_member_id: props.member.id,
        title: props.body.title,
        content: props.body.content,
        created_at: now,
        updated_at: now,
      },
    });

    // Create attachments if any
    if (props.body.attachments && props.body.attachments.length > 0) {
      await Promise.all(
        props.body.attachments.map((attachment) =>
          tx.econ_pol_discussion_board_attachments.create({
            data: {
              id: v4(),
              econ_pol_discussion_board_article_id: articleId,
              type: attachment.type,
              url: attachment.url,
              file_name: attachment.fileName,
              uploaded_at: now,
            },
          }),
        ),
      );
    }

    return createdArticle;
  });

  // Fetch author summary info for the member
  const authorRecord =
    await MyGlobal.prisma.econ_pol_discussion_board_members.findUnique({
      where: { id: props.member.id },
    });

  if (!authorRecord) {
    throw new HttpException("Author member not found", 404);
  }

  // Build author summary object
  const authorSummary: IEconPolDiscussionBoardMember.ISummary = {
    id: authorRecord.id,
    username: authorRecord.username,
    displayName: authorRecord.username,
    avatarUrl: null,
    memberSince: toISOStringSafe(authorRecord.created_at),
  };

  // Build final article response
  return {
    id: createResult.id,
    title: createResult.title,
    content: createResult.content,
    author: authorSummary,
    created_at: toISOStringSafe(createResult.created_at),
    updated_at: toISOStringSafe(createResult.updated_at),
  };
}
