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

export async function patchCommunityPlatformAdminHistories(props: {
  admin: AdminPayload;
  body: ICommunityPlatformCommunitySnapshot.IRequest;
}): Promise<IPageICommunityPlatformCommunitySnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE conditions for community_platform_community_snapshots
  const whereInput = {
    ...(props.body.snapshot_reason && {
      snapshot_reason: { contains: props.body.snapshot_reason },
    }),
    ...(props.body.created_at_start && {
      created_at: { gte: new Date(props.body.created_at_start) },
    }),
    ...(props.body.created_at_end && {
      created_at: { lte: new Date(props.body.created_at_end) },
    }),
  } satisfies Prisma.community_platform_community_snapshotsWhereInput;
  // Fetch snapshots with pagination
  const data =
    await MyGlobal.prisma.community_platform_community_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    });
  // Get total count
  const total =
    await MyGlobal.prisma.community_platform_community_snapshots.count({
      where: whereInput,
    });
  // Transform to ISummary format
  const transformedData = data.map((snapshot) => ({
    id: snapshot.id as string & tags.Format<"uuid">,
    name: snapshot.name,
    icon: snapshot.icon ?? null,
    created_at: snapshot.created_at.toISOString() as string &
      tags.Format<"date-time">,
    snapshot_reason: snapshot.snapshot_reason ?? null,
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
