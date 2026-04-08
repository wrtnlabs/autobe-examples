import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityPostImageContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImageContent";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditCommunityPostImageContentTransformer {
  export type Payload = Prisma.reddit_community_post_imagesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        image_url: true,
        thumbnail_url: true,
        created_at: true,
        updated_at: true,
        post: true,
      },
    } satisfies Prisma.reddit_community_post_imagesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityPostImageContent> {
    return {
      imageUrl: input.image_url,
      thumbnailUrl: input.thumbnail_url ?? null,
    } satisfies IRedditCommunityPostImageContent;
  }
}
