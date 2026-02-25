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
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { DiscussionBoardArticleTransformer } from "../transformers/DiscussionBoardArticleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardSuperAdminArticlesDraftsDraftIdPublish(props: {
  superAdmin: SuperAdminPayload;
  draftId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleDraft.IPublish;
}): Promise<IDiscussionBoardArticle> {
  const draft =
    await MyGlobal.prisma.discussion_board_article_drafts.findUniqueOrThrow({
      where: {
        id: props.draftId,
        draft_status: "draft",
        draft_deleted_at: null,
      },
    });
  const section =
    await MyGlobal.prisma.discussion_board_sections.findUniqueOrThrow({
      where: { id: props.body.section_id, status: "active", deleted_at: null },
    });
  const now = new Date().toISOString();
  const createdAt = new Date(now);
  const updatedAt = new Date(now);
  const article = await MyGlobal.prisma.discussion_board_articles.create({
    data: {
      id: v4(),
      title: draft.draft_title,
      content: draft.draft_content,
      status: "published",
      discussion_board_section_id: props.body.section_id,
      discussion_board_user_id: props.superAdmin.id,
      created_at: createdAt,
      updated_at: updatedAt,
      deleted_at: null,
    },
    ...DiscussionBoardArticleTransformer.select(),
  });
  await MyGlobal.prisma.discussion_board_article_drafts.update({
    where: { id: props.draftId },
    data: {
      draft_status: "published",
      discussion_board_article_id: article.id,
      draft_updated_at: createdAt,
    },
  });
  return await DiscussionBoardArticleTransformer.transform(article);
}
