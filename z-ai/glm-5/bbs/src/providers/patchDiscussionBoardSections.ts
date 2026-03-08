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
  // Build WHERE clause with optional filters
  const whereInput = {
    // Search filter - case-insensitive partial match on name OR description
    ...(props.body.search !== undefined && {
      OR: [
        { name: { contains: props.body.search, mode: "insensitive" as const } },
        {
          description: {
            contains: props.body.search,
            mode: "insensitive" as const,
          },
        },
      ],
    }),
    // Date range filters - combine gte and lte properly
    ...((props.body.createdFrom !== undefined ||
      props.body.createdTo !== undefined) && {
      created_at: {
        ...(props.body.createdFrom !== undefined && {
          gte: new Date(props.body.createdFrom),
        }),
        ...(props.body.createdTo !== undefined && {
          lte: new Date(props.body.createdTo),
        }),
      },
    }),
  } satisfies Prisma.discussion_board_sectionsWhereInput;
  // Fetch paginated data sorted by sequence ascending
  const data = await MyGlobal.prisma.discussion_board_sections.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { sequence: "asc" },
    ...DiscussionBoardSectionAtSummaryTransformer.select(),
  });
  // Get total count for pagination
  const total = await MyGlobal.prisma.discussion_board_sections.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      DiscussionBoardSectionAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
