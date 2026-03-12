import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditClonePostImageAtSummaryTransformer {
  export type Payload = Prisma.reddit_clone_post_imagesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        file_url: true,
        sequence: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        post: true,
      },
    } satisfies Prisma.reddit_clone_post_imagesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditClonePostImage.ISummary> {
    return {
      id: input.id,
      file_url: input.file_url,
      sequence: input.sequence,
      created_at: input.created_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
