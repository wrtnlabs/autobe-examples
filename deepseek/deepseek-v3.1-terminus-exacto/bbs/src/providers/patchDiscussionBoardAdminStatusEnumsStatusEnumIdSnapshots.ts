import { IDiscussionBoardStatusEnumSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusEnumSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardStatusEnumSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardStatusEnumSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardStatusEnumSnapshotAtSummaryTransformer } from "../transformers/DiscussionBoardStatusEnumSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminStatusEnumsStatusEnumIdSnapshots(props: {
  admin: AdminPayload;
  statusEnumId: string & tags.Format<"uuid">;
  body: IDiscussionBoardStatusEnumSnapshot.IRequest;
}): Promise<IPageIDiscussionBoardStatusEnumSnapshot.ISummary> {
  // Validate status enum exists and is accessible
  const statusEnum =
    await MyGlobal.prisma.discussion_board_status_enums.findUniqueOrThrow({
      where: {
        id: props.statusEnumId,
        deleted_at: null,
      },
      select: { id: true },
    });
  // Build WHERE clause with proper typing
  const whereInput: Prisma.discussion_board_status_enum_snapshotsWhereInput = {
    discussion_board_status_enum_id: statusEnum.id,
    deleted_at: null,
  };
  // Apply search filters with case-insensitive matching
  const searchTerm = props.body.search?.trim();
  if (searchTerm && searchTerm.length > 0) {
    whereInput.OR = [
      { snapshot_name: { contains: searchTerm, mode: "insensitive" as const } },
      { description: { contains: searchTerm, mode: "insensitive" as const } },
      {
        snapshot_reason: { contains: searchTerm, mode: "insensitive" as const },
      },
    ];
  } else {
    // Individual field filters when no global search
    if (props.body.snapshot_name) {
      whereInput.snapshot_name = {
        contains: props.body.snapshot_name.trim(),
        mode: "insensitive" as const,
      };
    }
    if (props.body.description) {
      whereInput.description = {
        contains: props.body.description.trim(),
        mode: "insensitive" as const,
      };
    }
    if (props.body.snapshot_reason) {
      whereInput.snapshot_reason = {
        contains: props.body.snapshot_reason.trim(),
        mode: "insensitive" as const,
      };
    }
  }
  // Pagination parameters with validation
  const page = Math.max(1, props.body.page ?? 1);
  const limit = Math.min(100, Math.max(1, props.body.limit ?? 20));
  const skip = (page - 1) * limit;
  // Execute queries in parallel
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_status_enum_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...DiscussionBoardStatusEnumSnapshotAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.discussion_board_status_enum_snapshots.count({
      where: whereInput,
    }),
  ]);
  // Transform results using the existing transformer
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardStatusEnumSnapshotAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit) || 0,
    } satisfies IPage.IPagination,
  };
}
