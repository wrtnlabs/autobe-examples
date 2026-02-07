import { IEconomicBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEconomicBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardComment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CitizenPayload } from "../decorators/payload/CitizenPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEconomicBoardCitizenArticlesArticleIdComments(props: {
  citizen: CitizenPayload;
  articleId: string;
  body: IEconomicBoardComment.IRequest;
}): Promise<IPageIEconomicBoardComment.ISummary> {
  // Use defaults for pagination since IRequest is empty
  const page = 1;
  const limit = 10;
  const skip = (page - 1) * limit;
  // Filter by articleId and active status (not deleted)
  const whereClause = {
    economic_board_articles_id: props.articleId,
    deleted_at: null,
  };
  // Get total count of matching comments
  const total = await MyGlobal.prisma.economic_board_comments.count({
    where: whereClause,
  });
  // Get paginated comments with author information using select
  const data = await MyGlobal.prisma.economic_board_comments.findMany({
    where: whereClause,
    skip,
    take: limit,
    orderBy: { created_at: "asc" },
    select: {
      id: true,
      content: true,
      created_at: true,
      author: {
        select: { display_name: true },
      },
    },
  });
  // Transform to ISummary format with proper type conversion
  const summaryData = data.map((comment) => ({
    id: comment.id,
    content: comment.content,
    created_at: toISOStringSafe(comment.created_at),
    author_display_name: comment.author.display_name,
  }));
  return {
    data: summaryData,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
