import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditPlatformCommentAtSummaryTransformer } from "./RedditPlatformCommentAtSummaryTransformer";
import { RedditPlatformMemberAtSummaryTransformer } from "./RedditPlatformMemberAtSummaryTransformer";

export namespace RedditPlatformCommentTransformer {
  export type Payload = Prisma.reddit_platform_commentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        body: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        author: RedditPlatformMemberAtSummaryTransformer.select(),
        parent: RedditPlatformCommentAtSummaryTransformer.select(),
        votes: {
          select: {
            vote_type: true,
          },
        } satisfies Prisma.reddit_platform_comment_votesFindManyArgs,
      },
    } satisfies Prisma.reddit_platform_commentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformComment> {
    return {
      id: input.id,
      body: input.body,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
      voteScore: input.votes.reduce((sum, v) => sum + v.vote_type, 0),
      author: await RedditPlatformMemberAtSummaryTransformer.transform(
        input.author,
      ),
      parent: input.parent
        ? await RedditPlatformCommentAtSummaryTransformer.transform(
            input.parent,
          )
        : undefined,
    };
  }
}
