import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import { ICommunityPlatformPostVoteSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVoteSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformMemberAtSummaryTransformer } from "./CommunityPlatformMemberAtSummaryTransformer";
import { CommunityPlatformPostAtSummaryTransformer } from "./CommunityPlatformPostAtSummaryTransformer";
import { CommunityPlatformPostVoteAtSummaryTransformer } from "./CommunityPlatformPostVoteAtSummaryTransformer";

export namespace CommunityPlatformPostVoteSnapshotAtSummaryTransformer {
  export type Payload = Prisma.community_platform_post_vote_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        vote_type: true,
        karma_impact: true,
        snapshot_reason: true,
        created_at: true,
        vote: CommunityPlatformPostVoteAtSummaryTransformer.select(),
        member: CommunityPlatformMemberAtSummaryTransformer.select(),
        post: CommunityPlatformPostAtSummaryTransformer.select(),
      },
    } satisfies Prisma.community_platform_post_vote_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformPostVoteSnapshot.ISummary> {
    return {
      id: input.id,
      voteType: input.vote_type,
      karmaImpact: input.karma_impact,
      snapshotReason: input.snapshot_reason,
      createdAt: input.created_at.toISOString(),
      vote: await CommunityPlatformPostVoteAtSummaryTransformer.transform(
        input.vote,
      ),
      member: await CommunityPlatformMemberAtSummaryTransformer.transform(
        input.member,
      ),
      post: await CommunityPlatformPostAtSummaryTransformer.transform(
        input.post,
      ),
    };
  }
}
