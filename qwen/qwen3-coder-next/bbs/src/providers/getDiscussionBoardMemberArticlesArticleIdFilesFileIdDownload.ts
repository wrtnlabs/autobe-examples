import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IString } from "@ORGANIZATION/PROJECT-api/lib/structures/IString";
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

export async function getDiscussionBoardMemberArticlesArticleIdFilesFileIdDownload(props: {
  member: MemberPayload;
  articleId: string;
  fileId: string;
}): Promise<IString> {
  // Validate that the file exists and belongs to the specified article
  const file = await MyGlobal.prisma.discussion_board_article_files.findUnique({
    where: {
      id: props.fileId,
      discussion_board_article_id: props.articleId,
      deleted_at: null,
    },
  });
  if (!file) {
    throw new HttpException("File not found or access denied", 404);
  }
  // Return the stored path as a URI string for file download
  return file.stored_path as string & tags.Format<"uri">;
}
