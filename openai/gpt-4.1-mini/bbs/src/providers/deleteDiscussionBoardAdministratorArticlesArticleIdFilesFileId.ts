import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardAdministratorArticlesArticleIdFilesFileId(props: {
  administrator: AdministratorPayload;
  articleId: string & tags.Format<"uuid">;
  fileId: string & tags.Format<"uuid">;
}): Promise<void> {
  const file = await MyGlobal.prisma.discussion_board_article_files.findUnique({
    where: { id: props.fileId },
  });
  if (!file || file.article_id !== props.articleId) {
    throw new HttpException("File not found", 404);
  }
  // Authorization is already done for administrators, so proceed
  await MyGlobal.prisma.discussion_board_article_files.delete({
    where: { id: props.fileId },
  });
}
