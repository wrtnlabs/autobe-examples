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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardStatusEnumSnapshotAtSummaryTransformer } from "../transformers/DiscussionBoardStatusEnumSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminStatusEnumsStatusEnumIdSnapshots(props: {
  superAdmin: SuperadminPayload;
  statusEnumId: string & tags.Format<"uuid">;
  body: IDiscussionBoardStatusEnumSnapshot.IRequest;
}): Promise<IPageIDiscussionBoardStatusEnumSnapshot.ISummary> {
  // Validate that the status enum exists
  await MyGlobal.prisma.discussion_board_status_enums.findUniqueOrThrow({
    where: { id: props.statusEnumId, deleted_at: null },
  });
  // Build WHERE clause with search filters
  const whereInput = {
    discussion_board_status_enum_id: props.statusEnumId,
    deleted_at: null,
    ...(props.body.search && {
      OR: [
        { snapshot_name: { contains: props.body.search } },
        { description: { contains: props.body.search } },
        { snapshot_reason: { contains: props.body.search } },
      ],
    }),
    ...(props.body.snapshot_name && {
      snapshot_name: { contains: props.body.snapshot_name },
    }),
    ...(props.body.description && {
      description: { contains: props.body.description },
    }),
    ...(props.body.snapshot_reason && {
      snapshot_reason: { contains: props.body.snapshot_reason },
    }),
  } satisfies Prisma.discussion_board_status_enum_snapshotsWhereInput;
  // Calculate pagination with validation
  const page = Math.max(1, props.body.page ?? 1);
  const limit = Math.min(Math.max(1, props.body.limit ?? 20), 100);
  const skip = (page - 1) * limit;
  // Fetch paginated data
  const data =
    await MyGlobal.prisma.discussion_board_status_enum_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...DiscussionBoardStatusEnumSnapshotAtSummaryTransformer.select(),
    });
  // Get total count
  const total =
    await MyGlobal.prisma.discussion_board_status_enum_snapshots.count({
      where: whereInput,
    });
  // Transform data using existing transformer
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
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
