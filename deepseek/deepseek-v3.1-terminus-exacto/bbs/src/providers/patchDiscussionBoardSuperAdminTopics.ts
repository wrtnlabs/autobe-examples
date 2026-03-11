import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardSectionAtSummaryTransformer } from "../transformers/DiscussionBoardSectionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchDiscussionBoardSuperAdminTopics(props: {
  superAdmin: SuperadminPayload;
  body: IDiscussionBoardSection.IRequest;
}): Promise<IPageIDiscussionBoardSection.ISummary> {
  // Default values for pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE clause with proper search term handling
  let whereInput: Prisma.discussion_board_sectionsWhereInput = {
    deleted_at: null,
  };
  // If search term provided, merge with existing whereInput
  if (props.body.search && props.body.search.trim().length > 0) {
    const searchTerm = props.body.search.trim();
    whereInput = {
      AND: [
        { deleted_at: null },
        {
          OR: [
            { name: { contains: searchTerm } },
            { description: { contains: searchTerm } },
          ],
        },
      ],
    } satisfies Prisma.discussion_board_sectionsWhereInput;
  }
  // Build ORDER BY clause with satisfies
  const orderByInput = (
    props.body.sort === "created_at:asc"
      ? { created_at: "asc" as const }
      : props.body.sort === "updated_at:desc"
        ? { updated_at: "desc" as const }
        : props.body.sort === "updated_at:asc"
          ? { updated_at: "asc" as const }
          : props.body.sort === "name:asc"
            ? { name: "asc" as const }
            : props.body.sort === "name:desc"
              ? { name: "desc" as const }
              : { created_at: "desc" as const }
  ) satisfies Prisma.discussion_board_sectionsOrderByWithRelationInput; // default
  // Get paginated data
  const data = await MyGlobal.prisma.discussion_board_sections.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...DiscussionBoardSectionAtSummaryTransformer.select(),
  });
  // Get total count for pagination
  const total = await MyGlobal.prisma.discussion_board_sections.count({
    where: whereInput,
  });
  // Transform data using transformer
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardSectionAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
