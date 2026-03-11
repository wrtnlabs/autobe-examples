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

export async function patchDiscussionBoardSuperAdminSections(props: {
  superAdmin: SuperadminPayload;
  body: IDiscussionBoardSection.IRequest;
}): Promise<IPageIDiscussionBoardSection.ISummary> {
  // Extract pagination parameters with validation
  const page = props.body.page ?? 1;
  const limit = Math.max(1, Math.min(100, props.body.limit ?? 100));
  const skip = (page - 1) * limit;
  // Build search filter for name and description using case-insensitive pattern matching
  const whereInput = {
    deleted_at: null,
    ...(props.body.search &&
      props.body.search.trim() && {
        OR: [
          {
            name: {
              contains: props.body.search,
              mode: Prisma.QueryMode.insensitive,
            },
          },
          {
            description: {
              contains: props.body.search,
              mode: Prisma.QueryMode.insensitive,
            },
          },
        ],
      }),
  } satisfies Prisma.discussion_board_sectionsWhereInput;
  // Build order by based on sort parameter with default
  const orderByInput = (
    !props.body.sort
      ? { created_at: "desc" as const }
      : props.body.sort === "created_at:desc"
        ? { created_at: "desc" as const }
        : props.body.sort === "created_at:asc"
          ? { created_at: "asc" as const }
          : props.body.sort === "updated_at:desc"
            ? { updated_at: "desc" as const }
            : props.body.sort === "updated_at:asc"
              ? { updated_at: "asc" as const }
              : props.body.sort === "name:asc"
                ? { name: "asc" as const }
                : { name: "desc" as const }
  ) satisfies Prisma.discussion_board_sectionsOrderByWithRelationInput;
  // Fetch paginated results with transformer select
  const data = await MyGlobal.prisma.discussion_board_sections.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...DiscussionBoardSectionAtSummaryTransformer.select(),
  });
  // Get total count for pagination metadata
  const total = await MyGlobal.prisma.discussion_board_sections.count({
    where: whereInput,
  });
  // Transform data using the summary transformer
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardSectionAtSummaryTransformer.transform,
  );
  // Return paginated response with proper pagination metadata
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
