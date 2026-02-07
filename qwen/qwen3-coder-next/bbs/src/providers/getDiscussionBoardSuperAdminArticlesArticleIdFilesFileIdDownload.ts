import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IString } from "@ORGANIZATION/PROJECT-api/lib/structures/IString";
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

export async function getDiscussionBoardSuperAdminArticlesArticleIdFilesFileIdDownload(props: {
  superAdmin: SuperadminPayload;
  articleId: string;
  fileId: string;
}): Promise<IString> {
  const file = await MyGlobal.prisma.discussion_board_article_files.findUnique({
    where: {
      id: props.fileId,
      discussion_board_article_id: props.articleId,
      deleted_at: null,
    },
  });
  if (!file) {
    throw new HttpException("File not found", 404);
  }
  return file.stored_path as IString;
}
