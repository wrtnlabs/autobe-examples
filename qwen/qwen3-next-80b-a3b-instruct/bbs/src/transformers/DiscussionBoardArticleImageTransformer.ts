import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardArticleImageTransformer {
  export type Payload = Prisma.discussion_board_article_imagesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        width: true,
        height: true,
        mime_type: true,
        file_size: true,
        uploaded_at: true,
        file_path: true,
        thumbnail_path: true,
        article: true,
      },
    } satisfies Prisma.discussion_board_article_imagesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardArticleImage> {
    return {
      name:
        input.file_path?.split("/").pop()?.split(".").slice(0, -1).join(".") ||
        "",
      extension: input.mime_type.split("/")[1],
      caption: "", // Not stored in database - generated
      altText: "", // Not stored in database - generated
    };
  }
}
