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
import { DiscussionBoardSectionAtSummaryTransformer } from "../transformers/DiscussionBoardSectionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSections(props: {
  body: IDiscussionBoardSection.IRequest;
}): Promise<IPageIDiscussionBoardSection.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build WHERE clause
  const whereInput: Prisma.discussion_board_sectionsWhereInput = {
    deleted_at: null,
  };
  // Add search filtering
  if (props.body.search != null && props.body.search.trim() !== "") {
    whereInput.OR = [
      { name: { contains: props.body.search, mode: "insensitive" } },
      { description: { contains: props.body.search, mode: "insensitive" } },
    ];
  }
  // Validate and build ORDER BY clause
  const allowedSortFields = ["id", "name", "created_at", "updated_at"] as const;
  const sortField = (
    allowedSortFields.includes(
      props.body.sort as (typeof allowedSortFields)[number],
    )
      ? (props.body.sort as (typeof allowedSortFields)[number])
      : "created_at"
  ) as "id" | "name" | "created_at" | "updated_at";
  const allowedDirections = ["asc", "desc"] as const;
  const direction = (
    allowedDirections.includes(
      props.body.direction as (typeof allowedDirections)[number],
    )
      ? (props.body.direction as (typeof allowedDirections)[number])
      : "desc"
  ) as "asc" | "desc";
  const orderByInput: Prisma.discussion_board_sectionsOrderByWithRelationInput =
    {
      [sortField]: direction,
    } satisfies Prisma.discussion_board_sectionsOrderByWithRelationInput;
  // Fetch data
  const data = await MyGlobal.prisma.discussion_board_sections.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...DiscussionBoardSectionAtSummaryTransformer.select(),
  });
  // Count total
  const total = await MyGlobal.prisma.discussion_board_sections.count({
    where: whereInput,
  });
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardSectionAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedData,
  };
}
