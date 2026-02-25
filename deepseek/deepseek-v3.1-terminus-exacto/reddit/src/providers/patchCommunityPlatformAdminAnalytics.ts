import { ICommunityPlatformSystemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformSystemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSystemSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformSystemSnapshotAtSummaryTransformer } from "../transformers/CommunityPlatformSystemSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformAdminAnalytics(props: {
  admin: AdminPayload;
}): Promise<IPageICommunityPlatformSystemSnapshot.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  // Build where clause with soft delete filter
  const whereInput = {
    deleted_at: null,
  } satisfies Prisma.community_platform_system_snapshotsWhereInput;
  // Query for paginated data
  const data =
    await MyGlobal.prisma.community_platform_system_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: {
        created_at: "desc",
      } satisfies Prisma.community_platform_system_snapshotsOrderByWithRelationInput,
      ...CommunityPlatformSystemSnapshotAtSummaryTransformer.select(),
    });
  // Query for total count
  const total = await MyGlobal.prisma.community_platform_system_snapshots.count(
    {
      where: whereInput,
    },
  );
  // Transform data using the transformer
  const transformedData = await ArrayUtil.asyncMap(
    data,
    CommunityPlatformSystemSnapshotAtSummaryTransformer.transform,
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
  } satisfies IPageICommunityPlatformSystemSnapshot.ISummary;
}
