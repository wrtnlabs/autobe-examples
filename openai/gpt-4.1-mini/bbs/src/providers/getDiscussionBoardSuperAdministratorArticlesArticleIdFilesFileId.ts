import { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { DiscussionBoardArticleFileTransformer } from "../transformers/DiscussionBoardArticleFileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardSuperAdministratorArticlesArticleIdFilesFileId(props: {
  superAdministrator: SuperadministratorPayload;
  articleId: string & tags.Format<"uuid">;
  fileId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardArticleFile> {
  const fileRecord =
    await MyGlobal.prisma.discussion_board_article_files.findUniqueOrThrow({
      where: { id: props.fileId },
      ...DiscussionBoardArticleFileTransformer.select(),
    });
  if (fileRecord.article_id !== props.articleId) {
    throw new HttpException(
      "File does not belong to the specified article",
      404,
    );
  }
  return await DiscussionBoardArticleFileTransformer.transform(fileRecord);
}
