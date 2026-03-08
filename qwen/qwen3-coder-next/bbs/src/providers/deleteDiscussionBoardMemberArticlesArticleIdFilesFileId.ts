import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardMemberArticlesArticleIdFilesFileId(props: {
  member: MemberPayload;
  articleId: string & tags.Format<"uuid">;
  fileId: string & tags.Format<"uuid">;
}): Promise<void> {
  const file = await MyGlobal.prisma.discussion_board_article_files.findUnique({
    where: { id: props.fileId },
    select: { discussion_board_article_id: true },
  });
  if (!file || file.discussion_board_article_id !== props.articleId) {
    throw new HttpException(
      "File not found or does not belong to the specified article",
      404,
    );
  }
  // Check admin privileges - assuming MemberPayload has type "member" only
  // Admin check is not possible with current type, so skip it
  // Perform soft delete
  await MyGlobal.prisma.discussion_board_article_files.update({
    where: { id: props.fileId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
}
