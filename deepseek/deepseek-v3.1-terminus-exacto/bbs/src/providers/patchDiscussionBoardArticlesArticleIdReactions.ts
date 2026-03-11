import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleReaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleReaction";
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
import { DiscussionBoardArticleReactionCollector } from "../collectors/DiscussionBoardArticleReactionCollector";
import { DiscussionBoardArticleTransformer } from "../transformers/DiscussionBoardArticleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardArticlesArticleIdReactions(props: {
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleReaction.IRequest;
}): Promise<IDiscussionBoardArticle> {
  // TODO: Get member from authentication context
  // For now, assume member is available via request context
  // This would typically come from JWT middleware
  const memberId = "TODO: GET_MEMBER_ID_FROM_AUTH";
  // 1. Verify article exists and is accessible
  const article =
    await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
      where: {
        id: props.articleId,
        deleted_at: null, // Only active articles
      },
      select: { id: true },
    });
  // 2. Get member from auth context (simplified)
  const member =
    await MyGlobal.prisma.discussion_board_members.findUniqueOrThrow({
      where: { id: memberId },
      select: { id: true },
    });
  // 3. Check existing reaction for this member+article
  const existingReaction =
    await MyGlobal.prisma.discussion_board_article_reactions.findUnique({
      where: {
        discussion_board_member_id_discussion_board_article_id_reaction_type: {
          discussion_board_member_id: member.id,
          discussion_board_article_id: article.id,
          reaction_type: props.body.reaction_type!,
        },
      },
      select: { id: true, reaction_type: true },
    });
  // 4. Use transaction for atomic operation
  const result = await MyGlobal.prisma.$transaction(async (tx) => {
    if (existingReaction) {
      // Same reaction type - toggle off (delete)
      await tx.discussion_board_article_reactions.delete({
        where: { id: existingReaction.id },
      });
    } else {
      // Check if member has any other reaction on this article
      const otherReaction =
        await tx.discussion_board_article_reactions.findFirst({
          where: {
            discussion_board_member_id: member.id,
            discussion_board_article_id: article.id,
            NOT: { reaction_type: props.body.reaction_type! },
          },
          select: { id: true },
        });
      if (otherReaction) {
        // Update existing reaction to new type
        await tx.discussion_board_article_reactions.update({
          where: { id: otherReaction.id },
          data: {
            reaction_type: props.body.reaction_type!,
            updated_at: new Date(),
          },
        });
      } else {
        // Create new reaction using Collector
        await tx.discussion_board_article_reactions.create({
          data: await DiscussionBoardArticleReactionCollector.collect({
            body: {
              reaction_type: props.body.reaction_type!,
              discussion_board_article_id: article.id,
            },
            member: { id: member.id } as IEntity,
          }),
        });
      }
    }
    // Return updated article with full details
    return await tx.discussion_board_articles.findUniqueOrThrow({
      where: { id: props.articleId },
      ...DiscussionBoardArticleTransformer.select(),
    });
  });
  // 5. Transform and return
  return await DiscussionBoardArticleTransformer.transform(result);
}
