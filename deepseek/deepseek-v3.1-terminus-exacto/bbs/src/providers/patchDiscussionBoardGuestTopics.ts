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
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { DiscussionBoardSectionAtSummaryTransformer } from "../transformers/DiscussionBoardSectionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardGuestTopics(props: {
  guest: GuestPayload;
  body: IDiscussionBoardSection.IRequest;
}): Promise<IPageIDiscussionBoardSection.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100);
  const skip = (page - 1) * limit;
  // Build WHERE conditions
  const whereConditions: Prisma.discussion_board_sectionsWhereInput = {
    deleted_at: null,
  };
  // Add search condition if provided
  if (props.body.search && props.body.search.trim() !== "") {
    const searchPattern = `%${props.body.search.trim()}%`;
    whereConditions.OR = [
      { name: { contains: searchPattern } },
      { description: { contains: searchPattern } },
    ];
  }
  // Build ORDER BY
  const orderByMapping = {
    "created_at:desc": { created_at: "desc" as const },
    "created_at:asc": { created_at: "asc" as const },
    "updated_at:desc": { updated_at: "desc" as const },
    "updated_at:asc": { updated_at: "asc" as const },
    "name:asc": { name: "asc" as const },
    "name:desc": { name: "desc" as const },
  };
  const orderBy = orderByMapping[props.body.sort || "created_at:desc"];
  // Execute queries
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_sections.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy,
      ...DiscussionBoardSectionAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.discussion_board_sections.count({
      where: whereConditions,
    }),
  ]);
  // Transform data
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardSectionAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
