import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { IRedditPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditPlatformMemberAtSummaryTransformer } from "./RedditPlatformMemberAtSummaryTransformer";
import { RedditPlatformPostAtSummaryTransformer } from "./RedditPlatformPostAtSummaryTransformer";

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
        post: RedditPlatformPostAtSummaryTransformer.select(),
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
      content: input.content ?? undefined,
      postType: input.post_type,
      url: input.url ?? undefined,
      imageUrl: input.image_url ?? undefined,
      voteScore: input.vote_score,
      commentCount: input.comment_count,
      snapshotType: input.snapshot_type,
      createdAt: input.created_at.toISOString(),
      author: await RedditPlatformMemberAtSummaryTransformer.transform(
        input.author,
      ),
      post: await RedditPlatformPostAtSummaryTransformer.transform(input.post),
    };
  }
}
