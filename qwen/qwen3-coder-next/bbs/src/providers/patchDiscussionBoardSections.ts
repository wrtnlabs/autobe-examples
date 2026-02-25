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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSections(props: {
  body: IDiscussionBoardSection.IRequest;
}): Promise<IPageIDiscussionBoardSection.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where clause
  const whereClause: Prisma.discussion_board_sectionsWhereInput = {
    ...(props.body.search && {
      OR: [
        { name: { contains: props.body.search, mode: "insensitive" } },
        { description: { contains: props.body.search, mode: "insensitive" } },
      ],
    }),
    ...(props.body.sectionIds && { id: { in: props.body.sectionIds } }),
  };
  // Fetch paginated data
  const data = await MyGlobal.prisma.discussion_board_sections.findMany({
    where: whereClause,
    skip,
    take: limit,
    orderBy: { created_at: Prisma.SortOrder.desc },
    select: {
      id: true,
      name: true,
      description: true,
      created_at: true,
    },
  });
  // Count total records
  const total = await MyGlobal.prisma.discussion_board_sections.count({
    where: whereClause,
  });
  // Transform to response DTO
  const transformedData: IDiscussionBoardSection.ISummary[] = data.map(
    (record) => ({
      id: record.id as string & tags.Format<"uuid">,
      name: record.name,
      description: record.description,
    }),
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: limit > 0 ? Math.ceil(total / limit) : 0,
    } satisfies IPage.IPagination,
    data: transformedData,
  } satisfies IPageIDiscussionBoardSection.ISummary;
}
