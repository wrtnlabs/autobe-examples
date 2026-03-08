import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformPostSnapshotAtSummaryTransformer } from "../transformers/CommunityPlatformPostSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformMemberPostsPostIdSnapshots(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPostSnapshot.IRequest;
}): Promise<IPageICommunityPlatformPostSnapshot.ISummary> {
  // Validate post exists (soft-deleted posts may still show snapshot history)
  await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow({
    where: { id: props.postId },
  });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build date filter conditions properly
  const dateConditions: {
    gte?: Date;
    lte?: Date;
  } = {};
  if (props.body.created_at_from !== undefined) {
    dateConditions.gte = new Date(props.body.created_at_from);
  }
  if (props.body.created_at_to !== undefined) {
    dateConditions.lte = new Date(props.body.created_at_to);
  }
  // Build where conditions
  const whereInput = {
    post_id: props.postId,
    ...(Object.keys(dateConditions).length > 0 && {
      created_at: dateConditions,
    }),
    ...(props.body.editor_id !== undefined && {
      editor_id: props.body.editor_id,
    }),
  } satisfies Prisma.community_platform_post_snapshotsWhereInput;
  // Query snapshots with transformer select
  const data = await MyGlobal.prisma.community_platform_post_snapshots.findMany(
    {
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...CommunityPlatformPostSnapshotAtSummaryTransformer.select(),
    },
  );
  // Count total records
  const total = await MyGlobal.prisma.community_platform_post_snapshots.count({
    where: whereInput,
  });
  // Transform and return paginated results
  return {
    data: await ArrayUtil.asyncMap(
      data,
      CommunityPlatformPostSnapshotAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
