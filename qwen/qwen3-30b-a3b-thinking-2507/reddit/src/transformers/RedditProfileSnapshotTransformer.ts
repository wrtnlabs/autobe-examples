import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditComment";
import { IRedditCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunity";
import { IRedditMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMember";
import { IRedditPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPostText";
import { IRedditProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditProfileSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCommentAtSummaryTransformer } from "./RedditCommentAtSummaryTransformer";

export namespace RedditProfileSnapshotTransformer {
  export type Payload = Prisma.reddit_comment_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        reddit_comment_id: true,
        content: true,
        post_id: true,
        author_id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        comment: RedditCommentAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_comment_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditProfileSnapshot> {
    return {
      id: input.id,
      reddit_comment_id: input.reddit_comment_id,
      content: input.content,
      post_id: input.post_id,
      author_id: input.author_id,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      comment: await RedditCommentAtSummaryTransformer.transform(input.comment),
    };
  }
}
