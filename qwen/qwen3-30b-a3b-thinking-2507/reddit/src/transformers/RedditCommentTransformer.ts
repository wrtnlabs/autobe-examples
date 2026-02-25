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

export namespace RedditCommentTransformer {
  export type Payload = Prisma.reddit_commentsGetPayload<
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
        post: RedditPostTextAtSummaryTransformer.select(),
        parent: RedditCommentAtSummaryTransformer.select(),
        replies: {
          select: RedditCommentAtSummaryTransformer.select(),
        },
        snapshots: true,
        votes: true,
      },
    } satisfies Prisma.reddit_commentsFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IRedditComment> {
    return {
      id: input.id,
      content: input.content,
      post: await RedditPostTextAtSummaryTransformer.transform(input.post),
      parent: input.parent
        ? await RedditCommentAtSummaryTransformer.transform(input.parent)
        : null,
      replies: await ArrayUtil.asyncMap(input.replies, (re) =>
        RedditCommentAtSummaryTransformer.transform(re),
      ),
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
    };
  }
}
