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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { DiscussionBoardSectionAtSummaryTransformer } from "../transformers/DiscussionBoardSectionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardMemberTopics(props: {
  member: MemberPayload;
  body: IDiscussionBoardSection.IRequest;
}): Promise<IPageIDiscussionBoardSection.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE clause
  const whereInput = {
    deleted_at: null,
    ...(props.body.search && {
      OR: [
        { name: { contains: props.body.search, mode: "insensitive" } },
        { description: { contains: props.body.search, mode: "insensitive" } },
      ],
    }),
  } satisfies Prisma.discussion_board_sectionsWhereInput;
  // Build ORDER BY
  const orderByInput = (
    props.body.sort === "created_at:desc"
      ? { created_at: "desc" as const }
      : props.body.sort === "created_at:asc"
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
  ) satisfies Prisma.discussion_board_sectionsOrderByWithRelationInput;
  // Execute paginated query
  const data = await MyGlobal.prisma.discussion_board_sections.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...DiscussionBoardSectionAtSummaryTransformer.select(),
  });
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
