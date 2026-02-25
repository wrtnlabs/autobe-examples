import { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardArticleFileTransformer } from "../transformers/DiscussionBoardArticleFileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardArticlesArticleIdFilesFileId(props: {
  articleId: string;
  fileId: string;
}): Promise<IDiscussionBoardArticleFile> {
  const file =
    await MyGlobal.prisma.discussion_board_article_files.findFirstOrThrow({
      where: {
        id: props.fileId,
        discussion_board_article_id: props.articleId,
        article: {
          deleted_at: null,
        },
      },
      ...DiscussionBoardArticleFileTransformer.select(),
    });
  return await DiscussionBoardArticleFileTransformer.transform(file);
}
