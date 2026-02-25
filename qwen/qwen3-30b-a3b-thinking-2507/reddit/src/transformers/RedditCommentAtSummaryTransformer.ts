import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditComment";
import { IRedditCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunity";
import { IRedditMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMember";
import { IRedditPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPostText";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCommentAtSummaryTransformer } from "./RedditCommentAtSummaryTransformer";
import { RedditPostTextAtSummaryTransformer } from "./RedditPostTextAtSummaryTransformer";

export namespace RedditCommentAtSummaryTransformer {
  export type Payload = Prisma.reddit_commentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select(): Prisma.reddit_commentsFindManyArgs {
    return {
      select: {
        id: true,
        content: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        post: RedditPostTextAtSummaryTransformer.select(),
        parent: RedditCommentAtSummaryTransformer.select(),
        replies: true,
        votes: {
          select: { direction: true },
        },
        snapshots: true,
      },
    } satisfies Prisma.reddit_commentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditComment.ISummary> {
    return {
      id: input.id,
      created_at: toISOStringSafe(input.created_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      post: await RedditPostTextAtSummaryTransformer.transform(input.post),
      parent: input.parent
        ? await RedditCommentAtSummaryTransformer.transform(input.parent)
        : null,
      voteScore: input.votes.reduce(
        (
          score: number,
          vote: {
            direction: "up" | "down";
          },
        ) => (vote.direction === "up" ? score + 1 : score - 1),
        0,
      ),
    };
  }
}
