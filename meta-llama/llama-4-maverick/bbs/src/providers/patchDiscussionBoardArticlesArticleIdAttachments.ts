import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import { IPageIDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleAttachment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchDiscussionBoardArticlesArticleIdAttachments(props: {
  articleId: string & tags.Format<"uuid">;
  body: string;
}): Promise<IPageIDiscussionBoardArticleAttachment.ISummary> {
  const page = typia.assert<number>(props.body);
  const limit = 100;
  const skip = (page - 1) * limit;
  const [attachments, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_article_attachments.findMany({
      where: { article_id: props.articleId },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.discussion_board_article_attachments.count({
      where: { article_id: props.articleId },
    }),
  ]);
  return {
    data: attachments.map((attachment) => ({
      id: attachment.id,
      reference: attachment.file_name satisfies string as string,
      type: attachment.file_type satisfies string as string,
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  } satisfies IPageIDiscussionBoardArticleAttachment.ISummary as IPageIDiscussionBoardArticleAttachment.ISummary;
}
