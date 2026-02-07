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
  articleId: string;
  tagId: string;
}): Promise<void> {
  // Verify the article-tag relationship exists
  const record = await MyGlobal.prisma.discussion_board_article_tags.findFirst({
    where: {
      bbs_article_id: props.articleId,
      tag_id: props.tagId,
    },
  });
  if (!record) {
    throw new HttpException("Article-tag relationship not found", 404);
  }
  // Delete the relationship
  await MyGlobal.prisma.discussion_board_article_tags.delete({
    where: {
      id: record.id,
    },
  });
}
