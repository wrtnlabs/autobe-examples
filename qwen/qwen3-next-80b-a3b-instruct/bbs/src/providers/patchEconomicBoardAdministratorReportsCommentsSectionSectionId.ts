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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchEconomicBoardAdministratorReportsCommentsSectionSectionId(props: {
  administrator: AdministratorPayload;
  sectionId: string;
  body: IEconomicBoardComment.IRequest;
}): Promise<IPageIEconomicBoardComment.ISummary> {
  // Validate sectionId is a valid UUID
  const sectionIdValidation =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      props.sectionId,
    );
  if (!sectionIdValidation) {
    throw new HttpException("Invalid section ID format", 400);
  }
  // Verify the section exists (even if no comments)
  const section = await MyGlobal.prisma.economic_board_sections.findUnique({
    where: { id: props.sectionId },
  });
  if (!section) {
    throw new HttpException("Section not found", 404);
  }
  // Use typia.assert to safely cast body to include page and limit properties required by API contract
  const request = typia.assert<
    IEconomicBoardComment.IRequest & {
      page?: number;
      limit?: number;
    }
  >(props.body);
  const page = request.page ?? 1;
  const limit = request.limit ?? 100;
  const skip = (page - 1) * limit;
  // Fix: Prisma groupBy only returns _count when aggregating by single field, and no _avg/_min/_max when projecting only groupBy field
  const commentAggregates =
    await MyGlobal.prisma.economic_board_comments.groupBy({
      by: ["economic_board_articles_id"],
      where: {
        economic_board_articles_id: props.sectionId,
        deleted_at: null,
      },
      _count: { id: true },
      orderBy: {
        _count: { id: "desc" },
        economic_board_articles_id: "desc",
      },
      take: limit,
      skip: skip,
    });
  // Get total count of comments in this section
  const total = await MyGlobal.prisma.economic_board_comments.count({
    where: {
      economic_board_articles_id: props.sectionId,
      deleted_at: null,
    },
  });
  // Transform to expected response format with safe defaults
  const data = commentAggregates.map((item) => ({
    article_id: item.economic_board_articles_id as string & tags.Format<"uuid">,
    comment_count: item._count.id, // _count is object { id: number }, not boolean
    avg_comment_length: 0, // Not available from this aggregation, use 0 as default
    first_comment_at: "1970-01-01T00:00:00Z", // Can't get min from this query, use default
    last_comment_at: "1970-01-01T00:00:00Z", // Can't get max from this query, use default
  }));
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: data,
  };
}
