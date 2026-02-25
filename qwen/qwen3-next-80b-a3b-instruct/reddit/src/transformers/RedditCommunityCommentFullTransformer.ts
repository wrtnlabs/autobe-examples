import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommentFull } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentFull";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCommunityMemberAtSummaryTransformer } from "./RedditCommunityMemberAtSummaryTransformer";

export namespace RedditCommunityCommentFullTransformer {
  export type Payload = Prisma.reddit_community_commentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        content: true,
        vote_score: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        author: RedditCommunityMemberAtSummaryTransformer.select(),
        post: {
          select: { id: true },
        } satisfies Prisma.reddit_community_postsFindManyArgs,
        parent: {
          select: { id: true },
        } satisfies Prisma.reddit_community_commentsFindManyArgs,
        replies: {
          select: { id: true },
        } satisfies Prisma.reddit_community_commentsFindManyArgs,
        commentVotes: {
          select: { id: true },
        } satisfies Prisma.reddit_community_comment_votesFindManyArgs,
        reports: {
          select: { id: true },
        } satisfies Prisma.reddit_community_reportsFindManyArgs,
      },
    } satisfies Prisma.reddit_community_commentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityCommentFull> {
    return {
      id: input.id,
      content: input.content,
      voteScore: input.vote_score,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      author: await RedditCommunityMemberAtSummaryTransformer.transform(
        input.author,
      ),
      parentId: input.parent?.id ?? null,
    };
  }
}
