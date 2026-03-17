import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import { ICommunityPlatformCommentVoteSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVoteSnapshot";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformCommentVoteSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommentVoteSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformCommentVoteSnapshotAtSummaryTransformer } from "../transformers/CommunityPlatformCommentVoteSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformCommentsCommentIdStatistics(props: {
  commentId: string;
  body: ICommunityPlatformCommentVoteSnapshot.IRequest;
}): Promise<IPageICommunityPlatformCommentVoteSnapshot.ISummary> {
  // Verify comment exists
  await MyGlobal.prisma.community_platform_comments.findUniqueOrThrow({
    where: { id: props.commentId },
  });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build where condition
  const whereInput = {
    comment_id: props.commentId,
    ...(props.body.vote_type && { vote_type: props.body.vote_type }),
    ...(props.body.snapshot_reason && {
      snapshot_reason: { contains: props.body.snapshot_reason },
    }),
    ...(props.body.created_at_start && {
      created_at: { gte: toISOStringSafe(props.body.created_at_start) },
    }),
    ...(props.body.created_at_end && {
      created_at: { lte: toISOStringSafe(props.body.created_at_end) },
    }),
  } satisfies Prisma.community_platform_comment_vote_snapshotsWhereInput;
  // Execute paginated queries
  const [data, total] = await Promise.all([
    MyGlobal.prisma.community_platform_comment_vote_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...CommunityPlatformCommentVoteSnapshotAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.community_platform_comment_vote_snapshots.count({
      where: whereInput,
    }),
  ]);
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    CommunityPlatformCommentVoteSnapshotAtSummaryTransformer.transform,
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
