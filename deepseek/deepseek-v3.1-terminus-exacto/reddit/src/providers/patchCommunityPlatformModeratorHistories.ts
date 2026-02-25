import { ICommunityPlatformCommunitySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformCommunitySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunitySnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { CommunityPlatformCommunitySnapshotAtSummaryTransformer } from "../transformers/CommunityPlatformCommunitySnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformModeratorHistories(props: {
  moderator: ModeratorPayload;
  body: ICommunityPlatformCommunitySnapshot.IRequest;
}): Promise<IPageICommunityPlatformCommunitySnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build where clause based on search criteria
  const whereInput: Prisma.community_platform_community_snapshotsWhereInput =
    {};
  // Filter by snapshot reason if provided
  if (
    props.body.snapshot_reason !== undefined &&
    props.body.snapshot_reason !== null
  ) {
    whereInput.snapshot_reason = { contains: props.body.snapshot_reason };
  }
  // Filter by created_at date range if provided
  if (
    props.body.created_at_start !== undefined ||
    props.body.created_at_end !== undefined
  ) {
    whereInput.created_at = {};
    if (props.body.created_at_start !== undefined) {
      whereInput.created_at.gte = new Date(props.body.created_at_start);
    }
    if (props.body.created_at_end !== undefined) {
      whereInput.created_at.lte = new Date(props.body.created_at_end);
    }
  }
  // Execute paginated query
  const [data, total] = await Promise.all([
    MyGlobal.prisma.community_platform_community_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...CommunityPlatformCommunitySnapshotAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.community_platform_community_snapshots.count({
      where: whereInput,
    }),
  ]);
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    CommunityPlatformCommunitySnapshotAtSummaryTransformer.transform,
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
