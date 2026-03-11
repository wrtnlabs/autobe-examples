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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardSectionSnapshotAtSummaryTransformer } from "../transformers/DiscussionBoardSectionSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminSectionsSectionIdSnapshots(props: {
  admin: AdminPayload;
  sectionId: string & tags.Format<"uuid">;
  body: IDiscussionBoardSectionSnapshot.IRequest;
}): Promise<IPageIDiscussionBoardSectionSnapshot.ISummary> {
  // Verify section exists and admin has access (section belongs to platform, no owner)
  const section = await MyGlobal.prisma.discussion_board_sections.findUnique({
    where: { id: props.sectionId, deleted_at: null },
  });
  if (!section) {
    throw new HttpException("Section not found", 404);
  }
  // Build WHERE clause for snapshots
  const whereInput: Prisma.discussion_board_section_snapshotsWhereInput = {
    discussion_board_section_id: props.sectionId,
  };
  // Optional date range filtering
  if (props.body.start_date) {
    whereInput.created_at = { gte: new Date(props.body.start_date) };
  }
  if (props.body.end_date) {
    if (
      whereInput.created_at &&
      typeof whereInput.created_at === "object" &&
      "gte" in whereInput.created_at
    ) {
      whereInput.created_at = {
        ...whereInput.created_at,
        lte: new Date(props.body.end_date),
      };
    } else {
      whereInput.created_at = { lte: new Date(props.body.end_date) };
    }
  }
  // Optional snapshot reason filter
  if (props.body.snapshot_reason !== undefined) {
    if (props.body.snapshot_reason === null) {
      whereInput.snapshot_reason = null;
    } else {
      whereInput.snapshot_reason = props.body.snapshot_reason;
    }
  }
  // Optional text search across name and snapshot_reason
  if (props.body.search) {
    whereInput.OR = [
      { name: { contains: props.body.search, mode: "insensitive" } },
      { snapshot_reason: { contains: props.body.search, mode: "insensitive" } },
    ];
  }
  // Pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Execute paginated query
  const data =
    await MyGlobal.prisma.discussion_board_section_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...DiscussionBoardSectionSnapshotAtSummaryTransformer.select(),
    });
  // Total count with same WHERE
  const total = await MyGlobal.prisma.discussion_board_section_snapshots.count({
    where: whereInput,
  });
  // Transform results
  const transformed = await ArrayUtil.asyncMap(data, (snapshot) =>
    DiscussionBoardSectionSnapshotAtSummaryTransformer.transform(snapshot),
  );
  // Build pagination response
  return {
    data: transformed,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit) || 0,
    } satisfies IPage.IPagination,
  };
}
