import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCloneMemberAtSummaryTransformer } from "./RedditCloneMemberAtSummaryTransformer";
import { RedditClonePostAtSummaryTransformer } from "./RedditClonePostAtSummaryTransformer";

export namespace RedditCloneCommentAtSummaryTransformer {
  export type Payload = Prisma.reddit_clone_commentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        content: true,
        score: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        author: RedditCloneMemberAtSummaryTransformer.select(),
        post: RedditClonePostAtSummaryTransformer.select(),
        parent: {
          select: {
            id: true,
            content: true,
            score: true,
            created_at: true,
            author: RedditCloneMemberAtSummaryTransformer.select(),
            post: RedditClonePostAtSummaryTransformer.select(),
          },
        } satisfies Prisma.reddit_clone_commentsFindManyArgs,
      },
    } satisfies Prisma.reddit_clone_commentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneComment.ISummary> {
    return {
      id: input.id,
      content: input.content,
      score: input.score,
      created_at: input.created_at.toISOString(),
      author: await RedditCloneMemberAtSummaryTransformer.transform(
        input.author,
      ),
      post: await RedditClonePostAtSummaryTransformer.transform(input.post),
      parent: input.parent
        ? {
            id: input.parent.id,
            content: input.parent.content,
            score: input.parent.score,
            created_at: input.parent.created_at.toISOString(),
            author: await RedditCloneMemberAtSummaryTransformer.transform(
              input.parent.author,
            ),
            post: await RedditClonePostAtSummaryTransformer.transform(
              input.parent.post,
            ),
            parent: null,
          }
        : null,
    };
  }
}
