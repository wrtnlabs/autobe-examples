import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import { IDiscussionBoardArticleTagMapping } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTagMapping";
import { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { DiscussionBoardArticleTransformer } from "../transformers/DiscussionBoardArticleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdministratorArticlesArticleIdTagMappings(props: {
  superAdministrator: SuperadministratorPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleTagMapping.IUpdate & {
    discussionBoardTagId: (string & tags.Format<"uuid">)[];
  };
}): Promise<IDiscussionBoardArticle> {
  await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
    where: { id: props.articleId },
    select: { id: true },
  });
  return await MyGlobal.prisma.$transaction(async (tx) => {
    // Remove old tag mappings
    await tx.discussion_board_article_tag_mappings.deleteMany({
      where: {
        discussion_board_article_id: props.articleId,
        discussion_board_tag_id: { in: props.body.discussionBoardTagId },
      },
    });
    // Validate tags to add exist
    const validTags = await tx.discussion_board_article_tags.findMany({
      where: { id: { in: props.body.discussionBoardTagId } },
      select: { id: true },
    });
    const validTagIds = validTags.map((t) => t.id);
    if (validTagIds.length !== props.body.discussionBoardTagId.length) {
      throw new HttpException("One or more tags to add do not exist", 400);
    }
    for (const tagId of validTagIds) {
      const existingMapping =
        await tx.discussion_board_article_tag_mappings.findUnique({
          where: {
            discussion_board_article_id_discussion_board_tag_id: {
              discussion_board_article_id: props.articleId,
              discussion_board_tag_id: tagId,
            },
          },
        });
      if (!existingMapping) {
        await tx.discussion_board_article_tag_mappings.create({
          data: {
            id: v4(),
            discussion_board_article_id: props.articleId,
            discussion_board_tag_id: tagId,
            created_at: toISOStringSafe(new Date()),
            updated_at: toISOStringSafe(new Date()),
            deleted_at: null,
          },
        });
      }
    }
    const article = await tx.discussion_board_articles.findUniqueOrThrow({
      where: { id: props.articleId },
      ...DiscussionBoardArticleTransformer.select(),
    });
    return await DiscussionBoardArticleTransformer.transform(article);
  });
}
