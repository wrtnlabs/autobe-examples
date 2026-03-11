import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleReaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleReaction";
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
import { DiscussionBoardArticleReactionCollector } from "../collectors/DiscussionBoardArticleReactionCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { DiscussionBoardArticleReactionTransformer } from "../transformers/DiscussionBoardArticleReactionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardMemberArticlesReactions(props: {
  member: MemberPayload;
  body: IDiscussionBoardArticleReaction.ICreate;
}): Promise<IDiscussionBoardArticleReaction> {
  // 1. Verify article exists and is accessible
  await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
    where: {
      id: props.body.discussion_board_article_id,
      deleted_at: null,
    },
  });
  // 2. Prepare creation using Collector
  try {
    const created =
      await MyGlobal.prisma.discussion_board_article_reactions.create({
        data: await DiscussionBoardArticleReactionCollector.collect({
          body: props.body,
          member: { id: props.member.id } as IEntity,
        }),
        ...DiscussionBoardArticleReactionTransformer.select(),
      });
    // 3. Transform and return
    return await DiscussionBoardArticleReactionTransformer.transform(created);
  } catch (error) {
    // Handle duplicate reaction constraint
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      // Unique constraint violation for (member_id, article_id, reaction_type)
      throw new HttpException(
        "You have already added this reaction type to this article",
        409,
      );
    }
    throw error;
  }
}
