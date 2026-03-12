import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditClonePostAtSummaryTransformer } from "./RedditClonePostAtSummaryTransformer";

export namespace RedditClonePostImageTransformer {
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
        post: RedditClonePostAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_clone_post_imagesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditClonePostImage> {
    return {
      id: input.id,
      file_url: input.file_url,
      sequence: input.sequence,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      post: await RedditClonePostAtSummaryTransformer.transform(input.post),
    };
  }
}
