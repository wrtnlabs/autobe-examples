import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import { IDiscussionBoardArticleTagMapping } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTagMapping";
import { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { DiscussionBoardArticleTagMappingTransformer } from "../transformers/DiscussionBoardArticleTagMappingTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardAdministratorArticleTagMappingsMappingId(props: {
  administrator: AdministratorPayload;
  mappingId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleTagMapping.IUpdate;
}): Promise<IDiscussionBoardArticleTagMapping> {
  // Ensure the target mapping exists
  const existing =
    await MyGlobal.prisma.discussion_board_article_tag_mappings.findUniqueOrThrow(
      {
        where: { id: props.mappingId },
      },
    );
  // Validate the referenced article exists
  await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
    where: { id: props.body.discussionBoardArticleId },
  });
  // Validate the referenced tag exists
  await MyGlobal.prisma.discussion_board_tags.findUniqueOrThrow({
    where: { id: props.body.discussionBoardTagId },
  });
  // Check for duplicate (article, tag) pairs excluding current mapping
  const duplicate =
    await MyGlobal.prisma.discussion_board_article_tag_mappings.findFirst({
      where: {
        discussion_board_article_id: props.body.discussionBoardArticleId,
        discussion_board_tag_id: props.body.discussionBoardTagId,
        NOT: { id: props.mappingId },
      },
    });
  if (duplicate !== null) {
    throw new HttpException("Duplicate article-tag mapping exists", 400);
  }
  // Update the mapping
  const updated =
    await MyGlobal.prisma.discussion_board_article_tag_mappings.update({
      where: { id: props.mappingId },
      data: {
        discussion_board_article_id: props.body.discussionBoardArticleId,
        discussion_board_tag_id: props.body.discussionBoardTagId,
        updated_at: toISOStringSafe(new Date()),
      },
      ...DiscussionBoardArticleTagMappingTransformer.select(),
    });
  return await DiscussionBoardArticleTagMappingTransformer.transform(updated);
}
