import { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleFile";
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

export async function patchDiscussionBoardAdministratorArticlesArticleIdFiles(props: {
  administrator: AdministratorPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleFile.IRequest;
}): Promise<IPageIDiscussionBoardArticleFile.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const whereCondition = {
    article_id: props.articleId,
    deleted_at: null,
  };
  const [files, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_article_files.findMany({
      where: whereCondition,
      skip: skip,
      take: limit,
      orderBy: [{ display_order: "asc" }, { id: "asc" }],
    }),
    MyGlobal.prisma.discussion_board_article_files.count({
      where: whereCondition,
    }),
  ]);
  // IDiscussionBoardArticleFile.ISummary is empty, so return empty objects
  const data = files.map(() => ({}));
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data,
  };
}
