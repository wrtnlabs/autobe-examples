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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { DiscussionBoardArticleTransformer } from "../transformers/DiscussionBoardArticleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardMemberArticlesArticleId(props: {
  member: MemberPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticle.IUpdate;
}): Promise<IDiscussionBoardArticle> {
  // Find article with ownership information
  const article =
    await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
      where: { id: props.articleId },
      select: {
        id: true,
        discussion_board_member_id: true,
        deleted_at: true,
      },
    });
  // Verify ownership or admin privilege
  if (article.discussion_board_member_id !== props.member.id) {
    // Check if member is an admin
    const admin = await MyGlobal.prisma.discussion_board_admins.findFirst({
      where: {
        id: props.member.id,
        deleted_at: null,
      },
    });
    if (admin === null) {
      throw new HttpException("Forbidden", 403);
    }
  }
  // Update article with provided fields
  await MyGlobal.prisma.discussion_board_articles.update({
    where: { id: props.articleId },
    data: {
      ...(props.body.title !== undefined && { title: props.body.title }),
      ...(props.body.body !== undefined && { body: props.body.body }),
      ...(props.body.discussion_board_section_id !== undefined && {
        discussion_board_section_id: props.body.discussion_board_section_id,
      }),
      updated_at: new Date(),
    },
  });
  // Create snapshot for audit trail
  const updatedArticle =
    await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
      where: { id: props.articleId },
      select: {
        id: true,
        title: true,
        body: true,
        discussion_board_section_id: true,
        discussion_board_member_id: true,
        created_at: true,
      },
    });
  await MyGlobal.prisma.discussion_board_article_snapshots.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      discussion_board_article_id: props.articleId,
      title: updatedArticle.title,
      body: updatedArticle.body,
      discussion_board_section_id: updatedArticle.discussion_board_section_id,
      discussion_board_member_id: updatedArticle.discussion_board_member_id,
      created_at: new Date(),
      updated_at: new Date(),
      file_count: 0,
      image_count: 0,
    },
  });
  // Return transformed article using transformer
  const articleWithRelations =
    await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
      where: { id: props.articleId },
      ...DiscussionBoardArticleTransformer.select(),
    });
  return await DiscussionBoardArticleTransformer.transform(
    articleWithRelations,
  );
}
