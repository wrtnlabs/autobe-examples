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
        file_path: true,
        mime_type: true,
        file_size: true,
        width: true,
        height: true,
        uploaded_at: true,
        thumbnail_path: true,
        article: {
          select: {
            id: true,
            is_primary: true,
            order: true,
            caption: true,
            alt: true,
            tags: true,
          },
        },
      },
    } satisfies Prisma.discussion_board_article_imagesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardArticleImage.ISummary> {
    // Extract filename from file_path URL
    const filename = input.file_path.split("/").pop() || "";
    return {
      id: input.id,
      url: input.file_path,
      filename: filename, // Extracted from file_path
      mimetype: input.mime_type,
      size: input.file_size,
      width: input.width,
      height: input.height,
      uploaded_at: toISOStringSafe(input.uploaded_at),
      article_id: input.article.id,
      is_primary: input.article.is_primary,
      order: input.article.order,
      caption: input.article.caption,
      alt: input.article.alt,
      tags: input.article.tags,
    };
  }
}
