import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditPlatformCommentAtSummaryTransformer } from "./RedditPlatformCommentAtSummaryTransformer";
import { RedditPlatformMemberAtSummaryTransformer } from "./RedditPlatformMemberAtSummaryTransformer";
import { RedditPlatformPostAtSummaryTransformer } from "./RedditPlatformPostAtSummaryTransformer";

export namespace RedditPlatformCommentTransformer {
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
        updated_at: true,
        deleted_at: true,
        author: RedditPlatformMemberAtSummaryTransformer.select(),
        post: RedditPlatformPostAtSummaryTransformer.select(),
        parent: RedditPlatformCommentAtSummaryTransformer.select(),
        replies: true,
        votes: true,
        moderationAuditLogs: true,
      },
    } satisfies Prisma.reddit_platform_commentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformComment> {
    return {
      id: input.id,
      author_id: input.author.id,
      post_id: input.post?.id ?? null,
      parent_id: input.parent?.id ?? null,
      content: input.content,
      vote_score: input.vote_score,
      author: await RedditPlatformMemberAtSummaryTransformer.transform(
        input.author,
      ),
      post: input.post
        ? await RedditPlatformPostAtSummaryTransformer.transform(input.post)
        : null,
      parent: input.parent
        ? await RedditPlatformCommentAtSummaryTransformer.transform(
            input.parent,
          )
        : null,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
    } satisfies IRedditPlatformComment;
  }
}
