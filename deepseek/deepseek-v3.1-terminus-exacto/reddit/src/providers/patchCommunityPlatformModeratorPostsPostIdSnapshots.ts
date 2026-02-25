import { ICommunityPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { CommunityPlatformPostSnapshotAtSummaryTransformer } from "../transformers/CommunityPlatformPostSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformModeratorPostsPostIdSnapshots(props: {
  moderator: ModeratorPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPostSnapshot.IRequest;
}): Promise<IPageICommunityPlatformPostSnapshot.ISummary> {
  // Verify post exists and moderator has access
  const post = await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow(
    {
      where: { id: props.postId },
    },
  );
  // Moderators can access any post snapshots in their moderated communities
  // Additional permission checks can be added here if needed
  // Build WHERE clause with proper date handling
  const whereInput = {
    community_platform_post_id: props.postId,
    ...(props.body.version_number !== undefined && {
      version_number: props.body.version_number,
    }),
    ...(props.body.created_at !== undefined && {
      created_at: {
        gte: new Date(props.body.created_at),
      },
    }),
    ...(props.body.edit_reason !== undefined &&
      props.body.edit_reason !== null && {
        edit_reason: { contains: props.body.edit_reason },
      }),
    ...(props.body.edit_reason === null && {
      edit_reason: null,
    }),
  } satisfies Prisma.community_platform_post_snapshotsWhereInput;
  // Pagination with validation
  const page = Math.max(1, props.body.page ?? 1);
  const limit = Math.min(Math.max(1, props.body.limit ?? 20), 100);
  const skip = (page - 1) * limit;
  // Query data with proper ordering
  const data = await MyGlobal.prisma.community_platform_post_snapshots.findMany(
    {
      where: whereInput,
      skip,
      take: limit,
      orderBy: { version_number: "desc" },
      ...CommunityPlatformPostSnapshotAtSummaryTransformer.select(),
    },
  );
  // Count total records
  const total = await MyGlobal.prisma.community_platform_post_snapshots.count({
    where: whereInput,
  });
  // Transform data using transformer
  const transformedData = await ArrayUtil.asyncMap(
    data,
    CommunityPlatformPostSnapshotAtSummaryTransformer.transform,
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
