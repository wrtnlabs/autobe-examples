import { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityPlatformPostImageTransformer {
  export type Payload = Prisma.community_platform_post_imagesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        image_url: true,
        image_alt_text: true,
        presentation_width: true,
        presentation_height: true,
      },
    } satisfies Prisma.community_platform_post_imagesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformPostImage> {
    return {
      image_url: true,
      image_alt_text: input.image_alt_text === null ? null : undefined,
      presentation_width: input.presentation_width === null ? null : undefined,
      presentation_height:
        input.presentation_height === null ? null : undefined,
    };
  }
}
