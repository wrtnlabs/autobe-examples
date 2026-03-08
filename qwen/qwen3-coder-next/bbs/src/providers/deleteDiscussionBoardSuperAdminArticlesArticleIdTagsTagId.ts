import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardSuperAdminArticlesArticleIdTagsTagId(props: {
  superAdmin: SuperadminPayload;
  articleId: string & tags.Format<"uuid">;
  tagId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify article exists and is accessible
  const article =
    await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
      where: { id: props.articleId },
    });
  // Delete the junction record - since the unique constraint is on article_id,
  // there can only be one tag association per article
  await MyGlobal.prisma.discussion_board_article_tags.delete({
    where: {
      article_id: props.articleId,
    },
  });
}
