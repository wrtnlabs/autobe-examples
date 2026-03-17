import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import { ICommunityPlatformPostVoteSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVoteSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformPostVoteSnapshotTransformer } from "../transformers/CommunityPlatformPostVoteSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformAdminPostsPostIdVotesVoteIdSnapshotsSnapshotId(props: {
  admin: AdminPayload;
  postId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformPostVoteSnapshot> {
  // First validate the vote-post relationship
  const vote =
    await MyGlobal.prisma.community_platform_post_votes.findUniqueOrThrow({
      where: {
        id: props.voteId,
        community_platform_post_id: props.postId,
      },
    });
  // Retrieve snapshot with full relational data
  const snapshot =
    await MyGlobal.prisma.community_platform_post_vote_snapshots.findUniqueOrThrow(
      {
        where: {
          id: props.snapshotId,
          community_platform_post_vote_id: props.voteId,
        },
        ...CommunityPlatformPostVoteSnapshotTransformer.select(),
      },
    );
  // Transform to DTO
  return await CommunityPlatformPostVoteSnapshotTransformer.transform(snapshot);
}
