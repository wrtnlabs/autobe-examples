import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardSuperAdminArticlesArticleIdFilesFileId(props: {
  superAdmin: SuperAdminPayload;
  articleId: string & tags.Format<"uuid">;
  fileId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify article exists (auto-throws 404 if not found)
  await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
    where: { id: props.articleId },
  });
  // Check if file exists and belongs to article
  const file = await MyGlobal.prisma.discussion_board_article_files.findFirst({
    where: {
      id: props.fileId,
      discussion_board_article_id: props.articleId,
      deleted_at: null,
    },
  });
  if (!file) {
    throw new HttpException(
      "File attachment not found or already deleted",
      404,
    );
  }
  // Super admin privilege: can delete any file regardless of uploader
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.discussion_board_article_files.update({
    where: { id: props.fileId },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });
}
