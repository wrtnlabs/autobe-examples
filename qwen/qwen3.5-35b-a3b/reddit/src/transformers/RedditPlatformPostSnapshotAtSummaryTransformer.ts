import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditPlatformMemberAtSummaryTransformer } from "./RedditPlatformMemberAtSummaryTransformer";

export namespace RedditPlatformPostSnapshotAtSummaryTransformer {
  export type Payload = Prisma.reddit_platform_post_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
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
        author: RedditPlatformMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_platform_post_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformPostSnapshot.ISummary> {
    return {
      id: input.id,
      title: input.title,
      post_type: input.post_type,
      url: input.url ?? null,
      image_url: input.image_url ?? null,
      vote_score: input.vote_score,
      comment_count: input.comment_count,
      snapshot_type: input.snapshot_type,
      author: await RedditPlatformMemberAtSummaryTransformer.transform(
        input.author,
      ),
      created_at: input.created_at.toISOString(),
    } satisfies IRedditPlatformPostSnapshot.ISummary;
  }
}
