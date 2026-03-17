import { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityPostAtImageContentTransformer {
  export type Payload = Prisma.community_post_imagesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        image_url: true,
        thumbnail_url: true,
      },
    } satisfies Prisma.community_post_imagesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPost.IImageContent> {
    return {
      imageUrl: input.image_url,
      thumbnailUrl: input.thumbnail_url,
    };
  }
}
