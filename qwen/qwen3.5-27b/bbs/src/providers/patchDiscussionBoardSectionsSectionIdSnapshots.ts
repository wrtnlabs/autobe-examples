import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
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
import { DiscussionBoardSectionSnapshotAtSummaryTransformer } from "../transformers/DiscussionBoardSectionSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSectionsSectionIdSnapshots(props: {
  sectionId: string & tags.Format<"uuid">;
  body: IDiscussionBoardSectionSnapshot.IRequest;
}): Promise<IPageIDiscussionBoardSectionSnapshot.ISummary> {
  // Validate section exists
  await MyGlobal.prisma.discussion_board_sections.findUniqueOrThrow({
    where: {
      id: props.sectionId,
    },
    select: {
      id: true,
    },
  });
  // Build WHERE clause
  const whereInput: Prisma.discussion_board_section_snapshotsWhereInput = {
    discussion_board_sections_id: props.sectionId,
    ...(props.body.search && {
      OR: [
        { name: { contains: props.body.search, mode: "insensitive" } },
        { description: { contains: props.body.search, mode: "insensitive" } },
      ],
    }),
    ...(props.body.fromDate && {
      created_at: {
        gte: new Date(props.body.fromDate),
      },
    }),
    ...(props.body.toDate && {
      created_at: {
        lte: new Date(props.body.toDate),
      },
    }),
  } satisfies Prisma.discussion_board_section_snapshotsWhereInput;
  // Parse pagination
  const page = props.body.page ?? 1;
  const pageSize = props.body.pageSize ?? 20;
  const limit = props.body.limit ?? 100;
  const take = Math.min(pageSize, limit);
  const skip = (page - 1) * take;
  // Build ORDER BY
  const sortBy = props.body.sortBy ?? "created_at";
  const sortOrder = props.body.sortOrder ?? "desc";
  const orderByInput: Prisma.discussion_board_section_snapshotsOrderByWithRelationInput =
    {
      [sortBy]: sortOrder,
    } satisfies Prisma.discussion_board_section_snapshotsOrderByWithRelationInput;
  // Fetch snapshots
  const data =
    await MyGlobal.prisma.discussion_board_section_snapshots.findMany({
      where: whereInput,
      skip,
      take,
      orderBy: orderByInput,
      ...DiscussionBoardSectionSnapshotAtSummaryTransformer.select(),
    });
  // Count total
  const total = await MyGlobal.prisma.discussion_board_section_snapshots.count({
    where: whereInput,
  });
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardSectionSnapshotAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: take,
      records: total,
      pages: Math.ceil(total / take),
    } satisfies IPage.IPagination,
    data: transformedData,
  };
}
