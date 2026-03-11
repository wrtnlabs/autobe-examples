import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditPlatformMemberAtSummaryTransformer } from "./RedditPlatformMemberAtSummaryTransformer";

export namespace RedditPlatformPostSnapshotTransformer {
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
        reddit_platform_post_id: true,
        author: RedditPlatformMemberAtSummaryTransformer.select(),
        post: true,
      },
    } satisfies Prisma.reddit_platform_post_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformPostSnapshot> {
    return {
      id: input.id,
      reddit_platform_post_id: input.reddit_platform_post_id,
      author: await RedditPlatformMemberAtSummaryTransformer.transform(
        input.author,
      ),
      title: input.title,
      content: input.content ?? undefined,
      post_type: typia.assert<"TEXT" | "LINK" | "IMAGE">(input.post_type),
      url: input.url ?? undefined,
      image_url: input.image_url ?? undefined,
      vote_score: input.vote_score,
      comment_count: input.comment_count,
      snapshot_type: typia.assert<"CREATE" | "EDIT" | "DELETE">(
        input.snapshot_type,
      ),
      created_at: toISOStringSafe(input.created_at),
    };
  }
}
