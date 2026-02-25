import { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardArticleFileAtSummaryTransformer } from "../transformers/DiscussionBoardArticleFileAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardArticlesArticleIdFiles(props: {
  articleId: string;
  body: IDiscussionBoardArticleFile.IUpdate;
}): Promise<IDiscussionBoardArticleFile.ISummary> {
  const file = await MyGlobal.prisma.discussion_board_article_files.findFirst({
    where: { discussion_board_article_id: props.articleId },
    orderBy: { created_at: "desc" },
    ...DiscussionBoardArticleFileAtSummaryTransformer.select(),
  });
  if (!file) {
    throw new HttpException("No file found for this article", 404);
  }
  if (props.body.original_filename !== undefined) {
    const updated = await MyGlobal.prisma.discussion_board_article_files.update(
      {
        where: { id: file.id },
        data: {
          original_filename: props.body.original_filename,
        },
        ...DiscussionBoardArticleFileAtSummaryTransformer.select(),
      },
    );
    return await DiscussionBoardArticleFileAtSummaryTransformer.transform(
      updated,
    );
  }
  return await DiscussionBoardArticleFileAtSummaryTransformer.transform(file);
}
