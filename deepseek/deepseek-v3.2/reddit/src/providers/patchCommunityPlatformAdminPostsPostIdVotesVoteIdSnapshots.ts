import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import { ICommunityPlatformPostVoteSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVoteSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformPostVoteSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostVoteSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformPostVoteSnapshotAtSummaryTransformer } from "../transformers/CommunityPlatformPostVoteSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformAdminPostsPostIdVotesVoteIdSnapshots(props: {
  admin: AdminPayload;
  postId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPostVoteSnapshot.IRequest;
}): Promise<IPageICommunityPlatformPostVoteSnapshot.ISummary> {
  // Verify admin exists (adminAuthorize already verified payload)
  const admin =
    await MyGlobal.prisma.community_platform_admins.findFirstOrThrow({
      where: { id: props.admin.id, deleted_at: null },
    });
  // Verify post exists and not deleted
  const post = await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow(
    {
      where: { id: props.postId, deleted_at: null },
      select: { id: true, community_platform_community_id: true },
    },
  );
  // Verify vote exists and belongs to the post
  const vote =
    await MyGlobal.prisma.community_platform_post_votes.findUniqueOrThrow({
      where: {
        id: props.voteId,
        community_platform_post_id: props.postId,
        deleted_at: null,
      },
      select: { id: true },
    });
  // Build WHERE clause for vote snapshots
  const whereInput = {
    community_platform_post_vote_id: props.voteId,
    ...(props.body.snapshot_reason !== undefined &&
      props.body.snapshot_reason !== null && {
        snapshot_reason: props.body.snapshot_reason,
      }),
    ...(props.body.karma_impact_min !== undefined && {
      karma_impact: { gte: props.body.karma_impact_min },
    }),
    ...(props.body.karma_impact_max !== undefined && {
      karma_impact: { lte: props.body.karma_impact_max },
    }),
    ...(props.body.created_at_from !== undefined && {
      created_at: { gte: new Date(props.body.created_at_from) },
    }),
    ...(props.body.created_at_to !== undefined && {
      created_at: { lte: new Date(props.body.created_at_to) },
    }),
    // Handle search - only include if snapshot_reason is not already being filtered by exact value
    ...(props.body.search !== undefined &&
      (props.body.snapshot_reason === undefined ||
        props.body.snapshot_reason === null) && {
        snapshot_reason: {
          contains: props.body.search,
          mode: "insensitive" as const,
        },
      }),
  } satisfies Prisma.community_platform_post_vote_snapshotsWhereInput;
  // Build ORDER BY
  const orderByInput = (
    props.body.sort === "created_at_asc"
      ? { created_at: "asc" as const }
      : props.body.sort === "karma_impact_desc"
        ? { karma_impact: "desc" as const }
        : props.body.sort === "karma_impact_asc"
          ? { karma_impact: "asc" as const }
          : { created_at: "desc" as const }
  ) satisfies Prisma.community_platform_post_vote_snapshotsOrderByWithRelationInput; // default
  // Pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Fetch data with transformer select
  const data =
    await MyGlobal.prisma.community_platform_post_vote_snapshots.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      ...CommunityPlatformPostVoteSnapshotAtSummaryTransformer.select(),
    });
  // Count total records
  const total =
    await MyGlobal.prisma.community_platform_post_vote_snapshots.count({
      where: whereInput,
    });
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    CommunityPlatformPostVoteSnapshotAtSummaryTransformer.transform,
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
