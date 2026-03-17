import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostTextContent";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditLikePostTextContentTransformer {
  export type Payload = Prisma.reddit_like_post_text_contentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        body: true,
        excerpt: true,
        created_at: true,
        updated_at: true,
        post: {
          select: {
            id: true,
          },
        } satisfies Prisma.reddit_like_postsFindManyArgs,
      },
    } satisfies Prisma.reddit_like_post_text_contentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditLikePostTextContent> {
    return {
      id: input.id,
      post_id: input.post.id,
      body: input.body,
      excerpt: input.excerpt,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
}
