import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditCloneFileThumbnailAtSummaryTransformer {
  export type Payload = Prisma.reddit_clone_file_thumbnailsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        variant: true,
        width: true,
        height: true,
        thumbnail_path: true,
        created_at: true,
        updated_at: true,
        file: true,
      },
    } satisfies Prisma.reddit_clone_file_thumbnailsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneFileThumbnail.ISummary> {
    return {
      id: input.id,
      variant: input.variant,
      width: input.width,
      height: input.height,
      thumbnailPath: input.thumbnail_path,
      createdAt: toISOStringSafe(input.created_at),
    };
  }
}
