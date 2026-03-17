import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import { ICommunityPlatformCommentVoteSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVoteSnapshot";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformCommentVoteSnapshotTransformer } from "../transformers/CommunityPlatformCommentVoteSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformAdminCommentsCommentIdVotesVoteIdSnapshotsSnapshotId(props: {
  admin: AdminPayload;
  commentId: string;
  voteId: string;
  snapshotId: string;
}): Promise<ICommunityPlatformCommentVoteSnapshot> {
  // 1. Validate comment exists
  await MyGlobal.prisma.community_platform_comments.findUniqueOrThrow({
    where: { id: props.commentId },
  });
  // 2. Validate vote exists and belongs to comment
  const vote =
    await MyGlobal.prisma.community_platform_comment_votes.findUniqueOrThrow({
      where: {
        id: props.voteId,
        community_platform_comment_id: props.commentId,
      },
    });
  // 3. Retrieve snapshot belonging to vote
  const snapshot =
    await MyGlobal.prisma.community_platform_comment_vote_snapshots.findUniqueOrThrow(
      {
        where: {
          id: props.snapshotId,
          comment_vote_id: props.voteId,
        },
        ...CommunityPlatformCommentVoteSnapshotTransformer.select(),
      },
    );
  // 4. Return transformed snapshot
  return await CommunityPlatformCommentVoteSnapshotTransformer.transform(
    snapshot,
  );
}
