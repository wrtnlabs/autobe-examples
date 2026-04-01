import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { IRedditLikePostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditLikeMemberAtSummaryTransformer } from "./RedditLikeMemberAtSummaryTransformer";
import { RedditLikePostAtSummaryTransformer } from "./RedditLikePostAtSummaryTransformer";

export namespace RedditLikePostSnapshotAtSummaryTransformer {
  export type Payload = Prisma.reddit_like_post_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export async function transform(
    input: Payload,
  ): Promise<IRedditLikePostSnapshot.ISummary> {
    return {
      id: input.id,
      post: await RedditLikePostAtSummaryTransformer.transform(input.post),
      title: input.title,
      contentType: input.content_type,
      author: await RedditLikeMemberAtSummaryTransformer.transform(
        input.post.author,
      ),
      voteScore: input.vote_score,
      commentCount: input.comment_count,
      isDeleted: input.is_deleted,
      createdAt: input.created_at.toISOString(),
    };
  }
  export function select() {
    return {
      select: {
        id: true,
        post: RedditLikePostAtSummaryTransformer.select(),
        title: true,
        content_type: true,
        author_id: true,
        community_id: true,
        vote_score: true,
        comment_count: true,
        is_deleted: true,
        created_at: true,
        textContent: {
          select: { id: true },
        },
        linkContent: {
          select: { id: true },
        },
        imageContent: {
          select: { id: true },
        },
      },
    } satisfies Prisma.reddit_like_post_snapshotsFindManyArgs;
  }
}
