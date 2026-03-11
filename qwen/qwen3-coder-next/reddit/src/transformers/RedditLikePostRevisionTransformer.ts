import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikePostRevision } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostRevision";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

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
        post: {
          select: {
            id: true,
            title: true,
            content: true,
            url: true,
            image_url: true,
            created_at: true,
          },
        } satisfies Prisma.reddit_like_postsFindManyArgs,
      },
    } satisfies Prisma.reddit_like_post_revisionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditLikePostRevision> {
    return {
      title: input.title,
      content: input.content ?? null,
      url: input.url ?? null,
      image_url: input.image_url ?? null,
      revision_number: input.revision_number,
      created_at: toISOStringSafe(input.created_at),
    };
  }
}
