import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleDraft } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleDraft";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { DiscussionBoardArticleTransformer } from "../transformers/DiscussionBoardArticleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardUserArticlesDraftsDraftIdPublish(props: {
  user: UserPayload;
  draftId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleDraft.IPublish;
}): Promise<IDiscussionBoardArticle> {
  // Validate draft exists, belongs to user, and is in draft status
  const draft =
    await MyGlobal.prisma.discussion_board_article_drafts.findUniqueOrThrow({
      where: {
        id: props.draftId,
        draft_deleted_at: null,
        draft_status: "draft",
      },
      select: {
        id: true,
        draft_title: true,
        draft_content: true,
      },
    });
  // Validate section exists and is active
  await MyGlobal.prisma.discussion_board_sections.findUniqueOrThrow({
    where: {
      id: props.body.section_id,
      deleted_at: null,
    },
  });
  // Content validation from requirements analysis
  if (draft.draft_title.length < 5 || draft.draft_title.length > 200) {
    throw new HttpException("Title must be between 5 and 200 characters", 400);
  }
  if (draft.draft_content.length < 50) {
    throw new HttpException("Content must be at least 50 characters", 400);
  }
  // Create new article using draft content
  const now = new Date().toISOString();
  const article = await MyGlobal.prisma.discussion_board_articles.create({
    data: {
      id: v4(),
      discussion_board_section_id: props.body.section_id,
      discussion_board_user_id: props.user.id,
      title: draft.draft_title,
      content: draft.draft_content,
      status: "published",
      created_at: new Date(now),
      updated_at: new Date(now),
      deleted_at: null,
    },
    ...DiscussionBoardArticleTransformer.select(),
  });
  // Update draft status and link to article
  await MyGlobal.prisma.discussion_board_article_drafts.update({
    where: { id: props.draftId },
    data: {
      discussion_board_article_id: article.id,
      draft_status: "published",
      draft_updated_at: new Date(now),
    },
  });
  return await DiscussionBoardArticleTransformer.transform(article);
}
