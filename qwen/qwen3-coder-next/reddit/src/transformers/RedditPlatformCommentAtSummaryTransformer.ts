import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditPlatformMemberAtSummaryTransformer } from "./RedditPlatformMemberAtSummaryTransformer";

export namespace RedditPlatformCommentAtSummaryTransformer {
  export type Payload = Prisma.reddit_platform_commentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        content: true,
        vote_score: true,
        created_at: true,
        author: RedditPlatformMemberAtSummaryTransformer.select(),
        updated_at: true,
        parent: {
          select: {
            id: true,
            content: true,
            vote_score: true,
            created_at: true,
            updated_at: true,
            author: RedditPlatformMemberAtSummaryTransformer.select(),
          },
        },
        post: {
          select: {
            id: true,
            title: true,
            content: true,
            vote_score: true,
            created_at: true,
            updated_at: true,
            author: RedditPlatformMemberAtSummaryTransformer.select(),
          },
        },
      },
    } satisfies Prisma.reddit_platform_commentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformComment.ISummary> {
    return {
      id: input.id,
      content: input.content,
      voteScore: input.vote_score,
      createdAt: input.created_at.toISOString(),
      author: await RedditPlatformMemberAtSummaryTransformer.transform(
        input.author,
      ),
    };
  }
}
