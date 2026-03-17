import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import { ICommunityPlatformCommentVoteSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVoteSnapshot";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformCommentVoteAtSummaryTransformer } from "./CommunityPlatformCommentVoteAtSummaryTransformer";
import { CommunityPlatformCommunityAtSummaryTransformer } from "./CommunityPlatformCommunityAtSummaryTransformer";
import { CommunityPlatformMemberAtSummaryTransformer } from "./CommunityPlatformMemberAtSummaryTransformer";

export namespace CommunityPlatformCommentVoteSnapshotAtSummaryTransformer {
  export type Payload =
    Prisma.community_platform_comment_vote_snapshotsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        vote_type: true,
        snapshot_reason: true,
        created_at: true,
        member: CommunityPlatformMemberAtSummaryTransformer.select(),
        commentVote: CommunityPlatformCommentVoteAtSummaryTransformer.select(),
        comment: {
          select: {
            id: true,
            content: true,
            vote_score: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            author: CommunityPlatformMemberAtSummaryTransformer.select(),
            post: {
              select: {
                id: true,
                title: true,
                created_at: true,
                author: CommunityPlatformMemberAtSummaryTransformer.select(),
                community:
                  CommunityPlatformCommunityAtSummaryTransformer.select(),
              },
            } satisfies Prisma.community_platform_postsFindManyArgs,
          },
        } satisfies Prisma.community_platform_commentsFindManyArgs,
      },
    } satisfies Prisma.community_platform_comment_vote_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformCommentVoteSnapshot.ISummary> {
    return {
      id: input.id,
      vote_type: input.vote_type,
      snapshot_reason: input.snapshot_reason ?? undefined,
      created_at: input.created_at.toISOString(),
      member: await CommunityPlatformMemberAtSummaryTransformer.transform(
        input.member,
      ),
      commentVote:
        await CommunityPlatformCommentVoteAtSummaryTransformer.transform(
          input.commentVote,
        ),
      comment: {},
    };
  }
}
