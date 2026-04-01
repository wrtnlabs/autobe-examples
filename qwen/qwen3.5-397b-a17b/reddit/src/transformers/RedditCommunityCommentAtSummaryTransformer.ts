import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCommunityMemberAtSummaryTransformer } from "./RedditCommunityMemberAtSummaryTransformer";

export namespace RedditCommunityCommentAtSummaryTransformer {
  export type Payload = Prisma.reddit_community_commentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        content: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        member: RedditCommunityMemberAtSummaryTransformer.select(),
        parentComment: {
          select: {
            id: true,
            content: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            member: RedditCommunityMemberAtSummaryTransformer.select(),
            votes: {
              select: {
                direction: true,
              },
            } satisfies Prisma.reddit_community_comment_votesFindManyArgs,
          },
        } satisfies Prisma.reddit_community_commentsFindManyArgs,
        votes: {
          select: {
            direction: true,
          },
        } satisfies Prisma.reddit_community_comment_votesFindManyArgs,
      },
    } satisfies Prisma.reddit_community_commentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityComment.ISummary> {
    const upvotes = input.votes.filter((v) => v.direction === "UPVOTE").length;
    const downvotes = input.votes.filter(
      (v) => v.direction === "DOWNVOTE",
    ).length;
    return {
      id: input.id,
      content: input.content,
      author: await RedditCommunityMemberAtSummaryTransformer.transform(
        input.member,
      ),
      parent: input.parentComment
        ? {
            id: input.parentComment.id,
            content: input.parentComment.content,
            author: await RedditCommunityMemberAtSummaryTransformer.transform(
              input.parentComment.member,
            ),
            parent: undefined,
            vote_score:
              input.parentComment.votes.filter((v) => v.direction === "UPVOTE")
                .length -
              input.parentComment.votes.filter(
                (v) => v.direction === "DOWNVOTE",
              ).length,
            created_at: input.parentComment.created_at.toISOString(),
            updated_at: input.parentComment.updated_at.toISOString(),
            deleted_at: input.parentComment.deleted_at
              ? input.parentComment.deleted_at.toISOString()
              : null,
          }
        : undefined,
      vote_score: upvotes - downvotes,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at ? input.deleted_at.toISOString() : null,
    };
  }
}
