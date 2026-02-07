import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardAdminArticlesArticleIdTagsTagId(props: {
  admin: AdminPayload;
  articleId: string;
  tagId: string;
}): Promise<void> {
  // Check if relationship exists first (idempotent behavior)
  const existing =
    await MyGlobal.prisma.discussion_board_article_tags.findUnique({
      where: {
        bbs_article_id_tag_id: {
          bbs_article_id: props.articleId,
          tag_id: props.tagId,
        },
      },
    });
  // If doesn't exist, return 200 (idempotent)
  if (!existing) {
    return;
  }
  // Delete the relationship
  await MyGlobal.prisma.discussion_board_article_tags.delete({
    where: {
      bbs_article_id_tag_id: {
        bbs_article_id: props.articleId,
        tag_id: props.tagId,
      },
    },
  });
}
