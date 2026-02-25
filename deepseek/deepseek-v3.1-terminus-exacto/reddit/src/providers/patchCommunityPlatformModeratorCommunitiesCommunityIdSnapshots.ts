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

export async function patchCommunityPlatformModeratorCommunitiesCommunityIdSnapshots(props: {
  moderator: ModeratorPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunitySnapshot.IRequest;
}): Promise<IPageICommunityPlatformCommunitySnapshot.ISummary> {
  // Verify moderator has access to this community
  const moderatorAccess =
    await MyGlobal.prisma.community_platform_community_moderators.findFirst({
      where: {
        community_id: props.communityId,
        user_id: props.moderator.id,
        is_active: true,
        deleted_at: null,
      },
    });
  if (!moderatorAccess) {
    throw new HttpException(
      "You do not have moderator access to this community",
      403,
    );
  }
  // Set pagination defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where clause with proper date handling
  const whereInput: Prisma.community_platform_community_snapshotsWhereInput = {
    community_platform_community_id: props.communityId,
  };
  // Add optional filters
  if (
    props.body.snapshot_reason !== undefined &&
    props.body.snapshot_reason !== null
  ) {
    whereInput.snapshot_reason = props.body.snapshot_reason;
  }
  if (props.body.created_at_start) {
    whereInput.created_at = {
      ...(whereInput.created_at as Prisma.DateTimeFilter),
      gte: new Date(props.body.created_at_start),
    };
  }
  if (props.body.created_at_end) {
    whereInput.created_at = {
      ...(whereInput.created_at as Prisma.DateTimeFilter),
      lte: new Date(props.body.created_at_end),
    };
  }
  // Fetch paginated data
  const data =
    await MyGlobal.prisma.community_platform_community_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...CommunityPlatformCommunitySnapshotAtSummaryTransformer.select(),
    });
  // Count total records
  const total =
    await MyGlobal.prisma.community_platform_community_snapshots.count({
      where: whereInput,
    });
  // Transform data
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
