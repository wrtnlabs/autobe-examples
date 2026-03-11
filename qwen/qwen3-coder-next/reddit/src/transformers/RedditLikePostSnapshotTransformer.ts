import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikePostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditLikeMemberAtSummaryTransformer } from "./RedditLikeMemberAtSummaryTransformer";

export namespace RedditLikePostSnapshotTransformer {
  export type Payload = Prisma.reddit_like_post_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        post: {
          select: { id: true },
        } satisfies Prisma.reddit_like_postsFindManyArgs,
        author: RedditLikeMemberAtSummaryTransformer.select(),
        title: true,
        type: true,
        content: true,
        url: true,
        image_url: true,
        vote_score: true,
        comment_count: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        snapshot_created_at: true,
      },
    } satisfies Prisma.reddit_like_post_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditLikePostSnapshot> {
    return {
      id: input.id,
      postId: input.post.id,
      author: await RedditLikeMemberAtSummaryTransformer.transform(
        input.author,
      ),
      title: input.title,
      type: typia.assert<"text" | "link" | "image">(input.type),
      content: input.content ?? "",
      url: typia.assert<string & tags.Format<"uri">>(input.url ?? ""),
      imageUrl: typia.assert<string & tags.Format<"uri">>(
        input.image_url ?? "",
      ),
      score: input.vote_score,
      commentCount: input.comment_count,
      createdAt: toISOStringSafe(input.created_at),
      updatedAt: input.updated_at ? toISOStringSafe(input.updated_at) : null,
      deletedAt: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      snapshotCreatedAt: toISOStringSafe(input.snapshot_created_at),
    };
  }
}
