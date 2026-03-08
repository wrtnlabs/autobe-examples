import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { IRedditLikePostRevision } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostRevision";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditLikeMemberAtSummaryTransformer } from "./RedditLikeMemberAtSummaryTransformer";
import { RedditLikePostAtSummaryTransformer } from "./RedditLikePostAtSummaryTransformer";

export namespace RedditLikePostRevisionTransformer {
  export type Payload = Prisma.reddit_like_post_revisionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        content: true,
        url: true,
        image_url: true,
        revision_number: true,
        created_at: true,
        post: RedditLikePostAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_like_post_revisionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditLikePostRevision> {
    return {
      id: input.id,
      post: await RedditLikePostAtSummaryTransformer.transform(input.post),
      author: await RedditLikeMemberAtSummaryTransformer.transform(
        input.post.author,
      ),
      title: input.title,
      content: input.content ?? null,
      url: input.url ?? null,
      image_url: input.image_url ?? null,
      revision_number: input.revision_number,
      created_at: input.created_at.toISOString(),
    };
  }
}
