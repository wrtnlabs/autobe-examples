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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformCommentVoteSnapshotAtSummaryTransformer } from "../transformers/CommunityPlatformCommentVoteSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformAdminCommentsCommentIdVotesVoteIdSnapshots(props: {
  admin: AdminPayload;
  commentId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommentVoteSnapshot.IRequest;
}): Promise<IPageICommunityPlatformCommentVoteSnapshot.ISummary> {
  // Verify vote exists and belongs to the comment
  const vote =
    await MyGlobal.prisma.community_platform_comment_votes.findUnique({
      where: {
        id: props.voteId,
        community_platform_comment_id: props.commentId,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (!vote) {
    throw new HttpException(
      "Vote not found or does not belong to the specified comment",
      404,
    );
  }
  // Build where clause
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    comment_vote_id: props.voteId,
    comment_id: props.commentId,
    ...(props.body.vote_type && { vote_type: props.body.vote_type }),
    ...(props.body.snapshot_reason && {
      snapshot_reason: {
        contains: props.body.snapshot_reason,
        mode: "insensitive",
      },
    }),
    ...(props.body.created_at_start && {
      created_at: { gte: new Date(props.body.created_at_start) },
    }),
    ...(props.body.created_at_end && {
      created_at: { lte: new Date(props.body.created_at_end) },
    }),
  } satisfies Prisma.community_platform_comment_vote_snapshotsWhereInput;
  // Get data with transformer select
  const data =
    await MyGlobal.prisma.community_platform_comment_vote_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...CommunityPlatformCommentVoteSnapshotAtSummaryTransformer.select(),
    });
  // Get total count
  const total =
    await MyGlobal.prisma.community_platform_comment_vote_snapshots.count({
      where: whereInput,
    });
  // Transform data
  const transformed = await ArrayUtil.asyncMap(
    data,
    CommunityPlatformCommentVoteSnapshotAtSummaryTransformer.transform,
  );
  return {
    data: transformed,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
