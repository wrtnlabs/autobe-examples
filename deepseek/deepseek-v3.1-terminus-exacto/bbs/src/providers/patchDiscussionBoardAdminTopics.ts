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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardSectionAtSummaryTransformer } from "../transformers/DiscussionBoardSectionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminTopics(props: {
  admin: AdminPayload;
  body: IDiscussionBoardSection.IRequest;
}): Promise<IPageIDiscussionBoardSection.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE clause
  const where: Prisma.discussion_board_sectionsWhereInput = {
    deleted_at: null,
  };
  // Apply search filter if provided
  if (props.body.search) {
    const search = `%${props.body.search}%`;
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }
  // Build ORDER BY clause based on sort parameter
  const orderByInput = (() => {
    switch (props.body.sort) {
      case "created_at:desc":
        return { created_at: "desc" as const };
      case "created_at:asc":
        return { created_at: "asc" as const };
      case "updated_at:desc":
        return { updated_at: "desc" as const };
      case "updated_at:asc":
        return { updated_at: "asc" as const };
      case "name:asc":
        return { name: "asc" as const };
      case "name:desc":
        return { name: "desc" as const };
      default:
        return { created_at: "desc" as const };
    }
  })() satisfies Prisma.discussion_board_sectionsOrderByWithRelationInput;
  // Execute data query with transformer select
  const data = await MyGlobal.prisma.discussion_board_sections.findMany({
    where,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...DiscussionBoardSectionAtSummaryTransformer.select(),
  });
  // Execute count query
  const total = await MyGlobal.prisma.discussion_board_sections.count({
    where,
  });
  // Transform data using transformer
  const transformed = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardSectionAtSummaryTransformer.transform,
  );
  // Construct pagination response
  return {
    data: transformed,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
