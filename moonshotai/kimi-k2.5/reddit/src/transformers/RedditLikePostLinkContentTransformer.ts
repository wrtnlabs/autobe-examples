import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikePostLinkContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostLinkContent";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditLikePostLinkContentTransformer {
  export type Payload = Prisma.reddit_like_post_link_contentsGetPayload<
    ReturnType<typeof select>
  >;
  export async function transform(
    input: Payload,
  ): Promise<IRedditLikePostLinkContent> {
    return {
      id: input.id,
      url: input.url,
      domain: input.domain,
      previewTitle: input.preview_title ?? null,
      previewDescription: input.preview_description ?? null,
      previewImageUrl: input.preview_image_url ?? null,
    };
  }
  export function select() {
    return {
      select: {
        id: true,
        url: true,
        domain: true,
        preview_title: true,
        preview_description: true,
        preview_image_url: true,
      },
    } satisfies Prisma.reddit_like_post_link_contentsFindManyArgs;
  }
}
