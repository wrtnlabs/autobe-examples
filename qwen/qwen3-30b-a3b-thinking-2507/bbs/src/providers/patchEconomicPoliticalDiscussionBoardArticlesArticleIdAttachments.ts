import { IEconomicPoliticalDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardAttachment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEconomicPoliticalDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicPoliticalDiscussionBoardAttachment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EconomicPoliticalDiscussionBoardAttachmentAtSummaryTransformer } from "../transformers/EconomicPoliticalDiscussionBoardAttachmentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEconomicPoliticalDiscussionBoardArticlesArticleIdAttachments(props: {
  articleId: string;
  body: IEconomicPoliticalDiscussionBoardAttachment.IRequest;
}): Promise<IPageIEconomicPoliticalDiscussionBoardAttachment.ISummary> {
  const { page = 1, limit = 100, sort = "newest" } = props.body;
  const pageNum = page;
  const pageSize = limit;
  const skip = (pageNum - 1) * pageSize;
  const data =
    await MyGlobal.prisma.economic_political_discussion_board_attachments.findMany(
      {
        where: {
          article_id: props.articleId,
          deleted_at: null,
        },
        skip,
        take: pageSize,
        orderBy: {
          created_at: sort === "newest" ? "desc" : "asc",
        },
        select: {
          id: true,
          url: true,
          type: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          article: true,
        },
      },
    );
  const total =
    await MyGlobal.prisma.economic_political_discussion_board_attachments.count(
      {
        where: {
          article_id: props.articleId,
          deleted_at: null,
        },
      },
    );
  const transformedData = await ArrayUtil.asyncMap(
    data,
    EconomicPoliticalDiscussionBoardAttachmentAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: pageNum,
      limit: pageSize,
      records: total,
      pages: Math.ceil(total / pageSize),
    },
  };
}
