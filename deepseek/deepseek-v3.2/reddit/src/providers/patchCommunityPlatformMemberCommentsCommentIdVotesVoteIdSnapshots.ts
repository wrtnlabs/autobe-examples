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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformCommentVoteSnapshotAtSummaryTransformer } from "../transformers/CommunityPlatformCommentVoteSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformMemberCommentsCommentIdVotesVoteIdSnapshots(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommentVoteSnapshot.IRequest;
}): Promise<IPageICommunityPlatformCommentVoteSnapshot.ISummary> {
  // 1. Validate comment and vote existence
  const comment =
    await MyGlobal.prisma.community_platform_comments.findUniqueOrThrow({
      where: { id: props.commentId },
      select: {
        id: true,
        member_id: true,
        post: {
          select: {
            community_platform_community_id: true,
          },
        },
      },
    });
  const vote =
    await MyGlobal.prisma.community_platform_comment_votes.findUniqueOrThrow({
      where: {
        id: props.voteId,
        comment: {
          id: props.commentId,
        },
      },
      select: {
        id: true,
        community_platform_member_id: true,
      },
    });
  // 2. Authorization check
  const isVoteOwner = vote.community_platform_member_id === props.member.id;
  const isCommentAuthor = comment.member_id === props.member.id;
  let isModerator = false;
  if (!isVoteOwner && !isCommentAuthor) {
    // Check if user is moderator of the community containing the comment
    const moderationRole =
      await MyGlobal.prisma.community_platform_moderation_roles.findFirst({
        where: {
          community_platform_member_id: props.member.id,
          community_platform_community_id:
            comment.post.community_platform_community_id,
          deleted_at: null,
        },
        select: { id: true },
      });
    isModerator = !!moderationRole;
  }
  if (!isVoteOwner && !isCommentAuthor && !isModerator) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Build where conditions
  const whereInput = {
    comment_vote_id: props.voteId,
    comment_id: props.commentId,
    ...(props.body.vote_type && { vote_type: props.body.vote_type }),
    ...(props.body.snapshot_reason && {
      snapshot_reason: { contains: props.body.snapshot_reason },
    }),
    ...(props.body.created_at_start &&
      props.body.created_at_end && {
        created_at: {
          gte: new Date(props.body.created_at_start),
          lte: new Date(props.body.created_at_end),
        },
      }),
  } satisfies Prisma.community_platform_comment_vote_snapshotsWhereInput;
  // 4. Pagination setup
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // 5. Query data with transformer select
  const data =
    await MyGlobal.prisma.community_platform_comment_vote_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...CommunityPlatformCommentVoteSnapshotAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.community_platform_comment_vote_snapshots.count({
      where: whereInput,
    });
  // 6. Transform results
  const transformed = await ArrayUtil.asyncMap(
    data,
    CommunityPlatformCommentVoteSnapshotAtSummaryTransformer.transform,
  );
  return {
    data: transformed,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
