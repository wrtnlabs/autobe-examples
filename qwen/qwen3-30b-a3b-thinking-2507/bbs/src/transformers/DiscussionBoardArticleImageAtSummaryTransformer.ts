import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardArticleImageAtSummaryTransformer {
  export type Payload = Prisma.discussion_board_article_imagesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        url: true,
        width: true,
        height: true,
        mime_type: true,
        size: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        article: true,
      },
    } satisfies Prisma.discussion_board_article_imagesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardArticleImage.ISummary> {
    return {
      id: input.id,
      url: input.url,
      width: input.width,
      height: input.height,
      mime_type: input.mime_type,
      is_primary: undefined,
    };
  }
}
