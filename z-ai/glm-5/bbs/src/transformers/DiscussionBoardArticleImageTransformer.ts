import { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardArticleImageTransformer {
  export type Payload = Prisma.discussion_board_article_imagesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        original_filename: true,
        storage_path: true,
        file_size: true,
        mime_type: true,
        width: true,
        height: true,
        created_at: true,
      },
    } satisfies Prisma.discussion_board_article_imagesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardArticleImage> {
    return {
      id: input.id,
      original_filename: input.original_filename,
      storage_path: input.storage_path,
      file_size: input.file_size,
      mime_type: input.mime_type,
      width: input.width,
      height: input.height,
      created_at: input.created_at.toISOString(),
    };
  }
}
