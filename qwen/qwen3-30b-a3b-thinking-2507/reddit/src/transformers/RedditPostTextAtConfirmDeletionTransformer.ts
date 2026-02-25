import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPostText";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditPostTextAtConfirmDeletionTransformer {
  export type Payload = Prisma.reddit_postsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        post_type: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        community: true,
        author: true,
        link: true,
        images: true,
        votes: true,
        text: true,
        comments: true,
      },
    } satisfies Prisma.reddit_postsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPostText.IConfirmDeletion> {
    return {
      post_id: input.id,
    };
  }
}
