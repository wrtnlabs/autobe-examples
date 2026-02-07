import { IDiscussionBoardSectionArchive } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionArchive";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardSectionArchive } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSectionArchive";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardSectionArchiveAtSummaryTransformer } from "../transformers/DiscussionBoardSectionArchiveAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminSectionsSectionIdArchives(props: {
  admin: AdminPayload;
  sectionId: string & tags.Format<"uuid">;
  body: IDiscussionBoardSectionArchive.IRequest;
}): Promise<IPageIDiscussionBoardSectionArchive.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE clause
  const whereInput: Prisma.discussion_board_section_archivesWhereInput = {
    discussion_board_section_id: props.sectionId,
  };
  // Apply text search filter
  if (props.body.search) {
    whereInput.reason = { contains: props.body.search, mode: "insensitive" };
  }
  // Apply date range filters - using string comparison since archived_at is DateTime
  if (props.body.archivedAtFrom || props.body.archivedAtTo) {
    whereInput.archived_at = {};
    if (props.body.archivedAtFrom) {
      whereInput.archived_at.gte = new Date(props.body.archivedAtFrom);
    }
    if (props.body.archivedAtTo) {
      whereInput.archived_at.lte = new Date(props.body.archivedAtTo);
    }
  }
  // Apply administrator filter
  if (props.body.archivedBy) {
    whereInput.archived_by = props.body.archivedBy;
  }
  // Determine sort order
  const orderByInput: Prisma.discussion_board_section_archivesOrderByWithRelationInput =
    props.body.sort === "archived_at_asc"
      ? { archived_at: "asc" }
      : props.body.sort === "reason_asc"
        ? { reason: "asc" }
        : props.body.sort === "reason_desc"
          ? { reason: "desc" }
          : { archived_at: "desc" }; // default
  // Execute queries
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_section_archives.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...DiscussionBoardSectionArchiveAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.discussion_board_section_archives.count({
      where: whereInput,
    }),
  ]);
  // Transform data
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardSectionArchiveAtSummaryTransformer.transform,
  );
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
