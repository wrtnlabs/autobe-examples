import { IDiscussionBoardSectionSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardSectionSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSectionSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardSectionSnapshotAtSummaryTransformer } from "../transformers/DiscussionBoardSectionSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchDiscussionBoardSuperAdminSectionsSectionIdSnapshots(props: {
  superAdmin: SuperadminPayload;
  sectionId: string & tags.Format<"uuid">;
  body: IDiscussionBoardSectionSnapshot.IRequest;
}): Promise<IPageIDiscussionBoardSectionSnapshot.ISummary> {
  // 1. Validate section existence
  await MyGlobal.prisma.discussion_board_sections.findUniqueOrThrow({
    where: { id: props.sectionId, deleted_at: null },
  });
  // 2. Build WHERE clause
  const whereInput = {
    discussion_board_section_id: props.sectionId,
    ...(props.body.search && {
      OR: [
        { name: { contains: props.body.search, mode: "insensitive" as const } },
        {
          snapshot_reason: {
            contains: props.body.search,
            mode: "insensitive" as const,
          },
        },
      ],
    }),
    ...(props.body.start_date && {
      created_at: { gte: new Date(props.body.start_date) },
    }),
    ...(props.body.end_date && {
      created_at: { lte: new Date(props.body.end_date) },
    }),
    ...(props.body.snapshot_reason !== undefined && {
      snapshot_reason:
        props.body.snapshot_reason === null
          ? { equals: null }
          : { equals: props.body.snapshot_reason },
    }),
  };
  // 3. Pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // 4. Execute queries
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_section_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" as const },
      ...DiscussionBoardSectionSnapshotAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.discussion_board_section_snapshots.count({
      where: whereInput,
    }),
  ]);
  // 5. Transform data
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardSectionSnapshotAtSummaryTransformer.transform,
  );
  // 6. Return paginated response
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
