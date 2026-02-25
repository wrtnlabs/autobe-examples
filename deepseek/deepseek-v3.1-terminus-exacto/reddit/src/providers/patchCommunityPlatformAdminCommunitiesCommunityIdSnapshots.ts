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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformAdminCommunitiesCommunityIdSnapshots(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunitySnapshot.IRequest;
}): Promise<IPageICommunityPlatformCommunitySnapshot.ISummary> {
  // Verify community exists
  await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
    where: { id: props.communityId },
  });
  // Build WHERE conditions with proper string date handling
  const whereInput = {
    community_platform_community_id: props.communityId,
    ...(props.body.snapshot_reason !== undefined &&
      props.body.snapshot_reason !== null && {
        snapshot_reason: props.body.snapshot_reason,
      }),
    ...(props.body.created_at_start !== undefined &&
      props.body.created_at_end !== undefined && {
        created_at: {
          gte: props.body.created_at_start,
          lte: props.body.created_at_end,
        },
      }),
    ...(props.body.created_at_start !== undefined &&
      props.body.created_at_end === undefined && {
        created_at: { gte: props.body.created_at_start },
      }),
    ...(props.body.created_at_end !== undefined &&
      props.body.created_at_start === undefined && {
        created_at: { lte: props.body.created_at_end },
      }),
  } satisfies Prisma.community_platform_community_snapshotsWhereInput;
  // Pagination parameters with constraints
  const page = Math.max(1, props.body.page ?? 1);
  const limit = Math.min(Math.max(1, props.body.limit ?? 100), 100);
  const skip = (page - 1) * limit;
  // Execute queries sequentially (not Promise.all)
  const data =
    await MyGlobal.prisma.community_platform_community_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    });
  const total =
    await MyGlobal.prisma.community_platform_community_snapshots.count({
      where: whereInput,
    });
  // Transform data to DTO format with proper null handling
  const transformedData: ICommunityPlatformCommunitySnapshot.ISummary[] =
    data.map((snapshot) => ({
      id: snapshot.id,
      name: snapshot.name,
      icon: snapshot.icon ?? undefined,
      created_at: snapshot.created_at.toISOString(),
      snapshot_reason: snapshot.snapshot_reason ?? undefined,
    }));
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
