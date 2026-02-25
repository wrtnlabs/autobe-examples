import { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";
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
import { EconomicBoardCitizenAtSummaryTransformer } from "../transformers/EconomicBoardCitizenAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchEconomicBoardCitizenComments(props: {
  citizen: CitizenPayload;
  body: IEconomicBoardComment.IRequest;
}): Promise<IPageIEconomicBoardComment.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  if (page < 1) throw new HttpException("Page must be at least 1", 400);
  if (limit > 100) throw new HttpException("Limit cannot exceed 100", 400);
  const skip = (page - 1) * limit;
  const where: Prisma.economic_board_commentsWhereInput = {
    deleted_at: null,
    ...(props.body.article_id && { article_id: props.body.article_id }),
    ...(props.body.author_id && { author_id: props.body.author_id }),
    ...(props.body.q && {
      content: { contains: props.body.q, mode: "insensitive" },
    }),
  };
  const orderBy: Prisma.economic_board_commentsOrderByWithRelationInput =
    props.body.sort === "oldest"
      ? { created_at: "asc" }
      : { created_at: "desc" };
  const data = await MyGlobal.prisma.economic_board_comments.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    select: {
      id: true,
      content: true,
      created_at: true,
      updated_at: true,
      author: EconomicBoardCitizenAtSummaryTransformer.select(),
    },
  });
  const total = await MyGlobal.prisma.economic_board_comments.count({ where });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      async (comment) =>
        ({
          id: comment.id,
          content: comment.content,
          created_at: toISOStringSafe(comment.created_at) as string &
            tags.Format<"date-time">,
          author: await EconomicBoardCitizenAtSummaryTransformer.transform(
            comment.author,
          ),
        }) satisfies IEconomicBoardComment.ISummary,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
