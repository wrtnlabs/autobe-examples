import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditClonePostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditClonePostSnapshotAtSummaryTransformer {
  export type Payload = Prisma.reddit_clone_post_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        content: true,
        post_type: true,
        link_url: true,
        file_url: true,
        score: true,
        original_created_at: true,
        original_updated_at: true,
        original_deleted_at: true,
        captured_at: true,
        post: true,
      },
    } satisfies Prisma.reddit_clone_post_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditClonePostSnapshot.ISummary> {
    return {
      id: input.id,
      reddit_clone_post_id: input.id,
      title: input.title,
      post_type: input.post_type,
      score: input.score,
      original_created_at: input.original_created_at.toISOString(),
      original_updated_at: input.original_updated_at.toISOString(),
      original_deleted_at: input.original_deleted_at?.toISOString() ?? null,
      captured_at: input.captured_at.toISOString(),
    };
  }
}
