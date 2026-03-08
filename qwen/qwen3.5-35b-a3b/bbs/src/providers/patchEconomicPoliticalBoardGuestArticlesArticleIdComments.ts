import { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import { IEconomicPoliticalBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardComment";
import { IEconomicPoliticalBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEconomicPoliticalBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicPoliticalBoardComment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { EconomicPoliticalBoardCommentAtSummaryTransformer } from "../transformers/EconomicPoliticalBoardCommentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEconomicPoliticalBoardGuestArticlesArticleIdComments(props: {
  guest: GuestPayload;
  articleId: string & tags.Format<"uuid">;
  body: IEconomicPoliticalBoardComment.IRequest;
}): Promise<IPageIEconomicPoliticalBoardComment.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const offset = (page - 1) * limit;
  const sortField = props.body.sort ?? "created_at";
  const sortOrder = props.body.sortOrder ?? "asc";
  const data = await MyGlobal.prisma.economic_political_board_comments.findMany(
    {
      where: {
        article_id: props.articleId,
        deleted_at: null,
      },
      skip: offset,
      take: limit,
      orderBy: {
        [sortField]: sortOrder,
      } satisfies Prisma.economic_political_board_commentsOrderByWithRelationInput,
      ...EconomicPoliticalBoardCommentAtSummaryTransformer.select(),
    },
  );
  const total = await MyGlobal.prisma.economic_political_board_comments.count({
    where: {
      article_id: props.articleId,
      deleted_at: null,
    },
  });
  const transformedData = await ArrayUtil.asyncMap(
    data,
    EconomicPoliticalBoardCommentAtSummaryTransformer.transform,
  );
  const totalPages = Math.ceil(total / limit);
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: totalPages,
    } satisfies IPage.IPagination,
  };
}
