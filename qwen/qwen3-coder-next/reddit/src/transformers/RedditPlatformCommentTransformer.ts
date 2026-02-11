import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditPlatformMemberAtSummaryTransformer } from "./RedditPlatformMemberAtSummaryTransformer";

export namespace RedditPlatformCommentTransformer {
  export type Payload = Prisma.reddit_platform_commentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        author_id: true,
        post_id: true,
        parent_comment_id: true,
        content: true,
        vote_score: true,
        created_at: true,
        updated_at: true,
        author: {
          select: {
            id: true,
            username: true,
            display_name: true,
            avatar_url: true,
          },
        },
      },
    } satisfies Prisma.reddit_platform_commentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformComment> {
    return {
      id: input.id,
      author_id: input.author_id,
      post_id: input.post_id,
      parent_comment_id: input.parent_comment_id,
      content: input.content,
      vote_score: input.vote_score,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      author: await RedditPlatformMemberAtSummaryTransformer.transform(
        input.author,
      ),
    };
  }
}
