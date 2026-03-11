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

export async function patchDiscussionBoardGuestSections(props: {
  guest: GuestPayload;
  body: IDiscussionBoardSection.IRequest;
}): Promise<IPageIDiscussionBoardSection.ISummary> {
  // Destructure request parameters with defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE clause - exclude deleted sections, optional search
  const whereInput = {
    deleted_at: null,
    ...(props.body.search &&
      props.body.search.trim() !== "" && {
        OR: [
          {
            name: { contains: props.body.search, mode: "insensitive" as const },
          },
          {
            description: {
              contains: props.body.search,
              mode: "insensitive" as const,
            },
          },
        ],
      }),
  } satisfies Prisma.discussion_board_sectionsWhereInput;
  // Determine ORDER BY with default
  let orderByInput: Prisma.discussion_board_sectionsOrderByWithRelationInput = {
    created_at: "desc",
  };
  if (props.body.sort) {
    const [field, direction] = props.body.sort.split(":") as [
      string,
      "asc" | "desc",
    ];
    if (field === "name") {
      orderByInput = { name: direction };
    } else if (field === "created_at") {
      orderByInput = { created_at: direction };
    } else if (field === "updated_at") {
      orderByInput = { updated_at: direction };
    }
  }
  // Execute findMany query first
  const data = await MyGlobal.prisma.discussion_board_sections.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...DiscussionBoardSectionAtSummaryTransformer.select(),
  });
  // Execute count query
  const total = await MyGlobal.prisma.discussion_board_sections.count({
    where: whereInput,
  });
  // Transform results using neighbor Transformer
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardSectionAtSummaryTransformer.transform,
  );
  // Return paginated response
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
