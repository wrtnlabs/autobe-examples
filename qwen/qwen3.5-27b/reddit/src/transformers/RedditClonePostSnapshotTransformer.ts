import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import { IRedditClonePostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditClonePostAtSummaryTransformer } from "./RedditClonePostAtSummaryTransformer";

export namespace RedditClonePostSnapshotTransformer {
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
        post: RedditClonePostAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_clone_post_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditClonePostSnapshot> {
    return {
      id: input.id,
      post: await RedditClonePostAtSummaryTransformer.transform(input.post),
      title: input.title,
      content: input.content ?? undefined,
      post_type: input.post_type,
      link_url: input.link_url ?? undefined,
      file_url: input.file_url ?? undefined,
      score: input.score,
      original_created_at: input.original_created_at.toISOString(),
      original_updated_at: input.original_updated_at.toISOString(),
      original_deleted_at: input.original_deleted_at?.toISOString() ?? null,
      captured_at: input.captured_at.toISOString(),
    };
  }
}
