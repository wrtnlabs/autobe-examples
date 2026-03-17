import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { IRedditCommunityVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityVote";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditCommunityVoteTransformer {
  export type Payload = Prisma.reddit_community_votesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        vote_type: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        member: true,
        targetPost: true,
        targetComment: true,
        karmaSnapshots: true,
        postTarget: true,
        commentVote: true,
      },
    } satisfies Prisma.reddit_community_votesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityVote> {
    return {
      id: input.id,
      vote_type: input.vote_type as "upvote" | "downvote",
      member: {
        id: input.member.id,
        username: input.member.username,
        created_at: toISOStringSafe(input.member.created_at),
      } satisfies IRedditCommunityMember.ISummary,
      targetPost: input.targetPost
        ? {
            id: input.targetPost.id,
            title: input.targetPost.title,
            author: {
              id: input.targetPost.author.id,
              username: input.targetPost.author.username,
              created_at: toISOStringSafe(input.targetPost.author.created_at),
            } satisfies IRedditCommunityMember.ISummary,
            community: {
              id: input.targetPost.community.id,
              name: input.targetPost.community.name,
              description: input.targetPost.community.description,
              subscriber_count: input.targetPost.community.subscriber_count,
              owner: {
                id: input.targetPost.community.owner.id,
                username: input.targetPost.community.owner.username,
                created_at: toISOStringSafe(
                  input.targetPost.community.owner.created_at,
                ),
              } satisfies IRedditCommunityMember.ISummary,
              created_at: toISOStringSafe(
                input.targetPost.community.created_at,
              ),
              updated_at: toISOStringSafe(
                input.targetPost.community.updated_at,
              ),
              deleted_at: input.targetPost.community.deleted_at
                ? toISOStringSafe(input.targetPost.community.deleted_at)
                : null,
            } satisfies IRedditCommunityCommunity.ISummary,
            vote_score: input.targetPost.vote_score,
            comment_count: input.targetPost.comment_count,
            created_at: toISOStringSafe(input.targetPost.created_at),
            post_type: input.targetPost.post_type as "text" | "link" | "image",
            preview_content: input.targetPost.preview_content,
          }
        : null,
      targetComment: input.targetComment
        ? ({
            id: input.targetComment.id,
            voteScore: input.targetComment.voteScore,
            createdAt: toISOStringSafe(input.targetComment.createdAt),
            parentComment: null,
            replyCount: input.targetComment.replyCount,
            author: {
              id: input.targetComment.author.id,
              username: input.targetComment.author.username,
              created_at: toISOStringSafe(
                input.targetComment.author.created_at,
              ),
            } satisfies IRedditCommunityMember.ISummary,
          } satisfies IRedditCommunityComment.ISummary)
        : null,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
    } satisfies IRedditCommunityVote;
  }
}
