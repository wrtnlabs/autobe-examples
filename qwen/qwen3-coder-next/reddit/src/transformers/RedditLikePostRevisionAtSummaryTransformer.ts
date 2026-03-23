import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikePostRevision } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostRevision";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditLikeMemberAtSummaryTransformer } from "./RedditLikeMemberAtSummaryTransformer";

export namespace RedditLikePostRevisionAtSummaryTransformer {
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
        post: {
          select: {
            author: RedditLikeMemberAtSummaryTransformer.select(),
          },
        } satisfies Prisma.reddit_like_postsFindManyArgs,
      },
    } satisfies Prisma.reddit_like_post_revisionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditLikePostRevision.ISummary> {
    return {
      id: input.id,
      title: input.title,
      content: input.content ?? undefined,
      url: input.url ?? undefined,
      image_url: input.image_url ?? undefined,
      revision_number: input.revision_number,
      created_at: input.created_at.toISOString(),
      author: await RedditLikeMemberAtSummaryTransformer.transform(
        input.post.author,
      ),
      type: input.content
        ? "text"
        : input.url
          ? "link"
          : input.image_url
            ? "image"
            : "text",
    };
  }
}
