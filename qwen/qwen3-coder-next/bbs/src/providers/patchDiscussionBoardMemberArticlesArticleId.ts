import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { DiscussionBoardArticleTransformer } from "../transformers/DiscussionBoardArticleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardMemberArticlesArticleId(props: {
  member: MemberPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticle.IUpdate;
}): Promise<IDiscussionBoardArticle> {
  // Find existing article with author info
  const existing = await MyGlobal.prisma.discussion_board_articles.findFirst({
    where: {
      id: props.articleId,
      deleted_at: null,
    },
    select: {
      id: true,
      title: true,
      content: true,
      section_id: true,
      author_id: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  if (!existing) {
    throw new HttpException("Article not found", 404);
  }
  // Verify ownership
  if (existing.author_id !== props.member.id) {
    throw new HttpException("Forbidden: you are not the article author", 403);
  }
  // Build update data with proper date conversion
  const updates: Prisma.discussion_board_articlesUpdateInput = {
    ...(props.body.title !== undefined && { title: props.body.title }),
    ...(props.body.content !== undefined && { content: props.body.content }),
    ...(props.body.section_id !== undefined && {
      section: { connect: { id: props.body.section_id } },
    }),
    updated_at: new Date(),
  };
  // Update the article
  const updatedRecord = await MyGlobal.prisma.discussion_board_articles.update({
    where: { id: props.articleId },
    data: updates,
    ...DiscussionBoardArticleTransformer.select(),
  });
  return await DiscussionBoardArticleTransformer.transform(updatedRecord);
}
