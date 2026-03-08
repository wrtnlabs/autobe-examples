import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditPlatformPostSnapshotTransformer {
  export type Payload = Prisma.reddit_platform_post_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        reddit_platform_post_id: true,
        author_id: true,
        title: true,
        content: true,
        post_type: true,
        url: true,
        image_url: true,
        vote_score: true,
        comment_count: true,
        snapshot_type: true,
        created_at: true,
        post: true,
        author: true,
      },
    } satisfies Prisma.reddit_platform_post_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformPostSnapshot> {
    return {
      id: input.id,
      reddit_platform_post_id: input.reddit_platform_post_id,
      author_id: input.author_id,
      title: input.title,
      content: input.content ?? null,
      post_type: input.post_type,
      url: input.url ?? null,
      image_url: input.image_url ?? null,
      vote_score: input.vote_score,
      comment_count: input.comment_count,
      snapshot_type: input.snapshot_type,
      created_at: toISOStringSafe(input.created_at),
    };
  }
}
