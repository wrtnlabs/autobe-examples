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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { DiscussionBoardArticleTransformer } from "../transformers/DiscussionBoardArticleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardMemberArticlesArticleId(props: {
  member: MemberPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticle.IUpdate;
}): Promise<IDiscussionBoardArticle> {
  // 1. Find article by ID (404 if not found)
  const article =
    await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
      where: { id: props.articleId },
      select: {
        id: true,
        discussion_board_member_id: true,
        title: true,
        body: true,
        discussion_board_section_id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  // 2. Validate ownership
  if (article.discussion_board_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Update article title and body
  await MyGlobal.prisma.discussion_board_articles.update({
    where: { id: props.articleId },
    data: {
      ...(props.body.title !== undefined && { title: props.body.title }),
      ...(props.body.body !== undefined && { body: props.body.body }),
      updated_at: toISOStringSafe(new Date()),
    },
  });
  // 4. Handle tags - delete existing associations
  if (props.body.tags !== undefined) {
    await MyGlobal.prisma.discussion_board_article_tags.deleteMany({
      where: { discussion_board_article_id: props.articleId },
    });
    // Find or create tags and create new associations
    const uniqueTags = Array.from(new Set(props.body.tags));
    const tagIds: Array<string & tags.Format<"uuid">> = [];
    for (const tagName of uniqueTags) {
      // Find existing tag or create new one
      let tag = await MyGlobal.prisma.discussion_board_tags.findFirst({
        where: { name: tagName, deleted_at: null },
      });
      if (tag === null) {
        const tagId = v4() as string & tags.Format<"uuid">;
        await MyGlobal.prisma.discussion_board_tags.create({
          data: {
            id: tagId,
            name: tagName,
            created_at: toISOStringSafe(new Date()),
            updated_at: toISOStringSafe(new Date()),
            deleted_at: null,
          },
        });
        tagIds.push(tagId);
      } else {
        tagIds.push(tag.id as string & tags.Format<"uuid">);
      }
    }
    // Create new article-tag associations
    if (tagIds.length > 0) {
      await MyGlobal.prisma.discussion_board_article_tags.createMany({
        data: tagIds.map((tagId) => ({
          id: v4() as string & tags.Format<"uuid">,
          discussion_board_article_id: props.articleId,
          discussion_board_tag_id: tagId,
          created_at: toISOStringSafe(new Date()),
          updated_at: toISOStringSafe(new Date()),
          deleted_at: null,
        })),
      });
    }
  }
  // 5. Return updated article using transformer
  const updated =
    await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
      where: { id: props.articleId },
      ...DiscussionBoardArticleTransformer.select(),
    });
  return await DiscussionBoardArticleTransformer.transform(updated);
}
