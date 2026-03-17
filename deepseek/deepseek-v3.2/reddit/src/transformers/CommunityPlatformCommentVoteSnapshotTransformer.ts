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
import { CommunityPlatformMemberAtSummaryTransformer } from "./CommunityPlatformMemberAtSummaryTransformer";
import { CommunityPlatformPostAtSummaryTransformer } from "./CommunityPlatformPostAtSummaryTransformer";

export namespace CommunityPlatformCommentVoteSnapshotTransformer {
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
        commentVote: CommunityPlatformCommentVoteAtSummaryTransformer.select(),
        member: CommunityPlatformMemberAtSummaryTransformer.select(),
        comment: {
          select: {
            id: true,
            content: true,
            vote_score: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            author: CommunityPlatformMemberAtSummaryTransformer.select(),
            post: CommunityPlatformPostAtSummaryTransformer.select(),
            parent: {
              select: {
                id: true,
                content: true,
                vote_score: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
                author: CommunityPlatformMemberAtSummaryTransformer.select(),
                post: CommunityPlatformPostAtSummaryTransformer.select(),
              },
            } satisfies Prisma.community_platform_commentsFindManyArgs,
          },
        } satisfies Prisma.community_platform_commentsFindManyArgs,
      },
    } satisfies Prisma.community_platform_comment_vote_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformCommentVoteSnapshot> {
    return {
      id: input.id,
      vote_type: input.vote_type as "upvote" | "downvote",
      snapshot_reason: input.snapshot_reason ?? null,
      created_at: toISOStringSafe(input.created_at),
      comment_vote:
        await CommunityPlatformCommentVoteAtSummaryTransformer.transform(
          input.commentVote,
        ),
      member: await CommunityPlatformMemberAtSummaryTransformer.transform(
        input.member,
      ),
      comment: {
        id: input.comment.id,
        content: input.comment.content,
        voteScore: input.comment.vote_score,
        createdAt: toISOStringSafe(input.comment.created_at),
        updatedAt: toISOStringSafe(input.comment.updated_at),
        deletedAt: input.comment.deleted_at
          ? toISOStringSafe(input.comment.deleted_at)
          : null,
        author: await CommunityPlatformMemberAtSummaryTransformer.transform(
          input.comment.author,
        ),
        post: await CommunityPlatformPostAtSummaryTransformer.transform(
          input.comment.post,
        ),
        parent: input.comment.parent
          ? ({
              id: input.comment.parent.id,
              content: input.comment.parent.content,
              voteScore: input.comment.parent.vote_score,
              createdAt: toISOStringSafe(input.comment.parent.created_at),
              updatedAt: toISOStringSafe(input.comment.parent.updated_at),
              deletedAt: input.comment.parent.deleted_at
                ? toISOStringSafe(input.comment.parent.deleted_at)
                : null,
              author:
                await CommunityPlatformMemberAtSummaryTransformer.transform(
                  input.comment.parent.author,
                ),
              post: await CommunityPlatformPostAtSummaryTransformer.transform(
                input.comment.parent.post,
              ),
            } satisfies ICommunityPlatformComment.ISummary)
          : null,
      } satisfies ICommunityPlatformComment.ISummary,
    };
  }
}
