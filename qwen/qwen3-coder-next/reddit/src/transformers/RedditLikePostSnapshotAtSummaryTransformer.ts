import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikePostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditLikeMemberAtSummaryTransformer } from "./RedditLikeMemberAtSummaryTransformer";

export namespace RedditLikePostSnapshotAtSummaryTransformer {
  export type Payload = Prisma.reddit_like_post_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        type: true,
        author: RedditLikeMemberAtSummaryTransformer.select(),
        snapshot_created_at: true,
      },
    } satisfies Prisma.reddit_like_post_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditLikePostSnapshot.ISummary> {
    return {
      id: input.id,
      title: input.title,
      type: typia.assert<"text" | "link" | "image">(input.type),
      author: await RedditLikeMemberAtSummaryTransformer.transform(
        input.author,
      ),
      snapshot_created_at: toISOStringSafe(input.snapshot_created_at),
    };
  }
}
