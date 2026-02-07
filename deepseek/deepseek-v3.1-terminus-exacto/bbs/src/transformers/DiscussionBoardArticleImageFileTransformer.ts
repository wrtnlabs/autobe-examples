import { IDiscussionBoardArticleImageFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImageFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardArticleImageFileTransformer {
  export type Payload = Prisma.discussion_board_article_image_filesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        filename: true,
        file_size: true,
        mime_type: true,
        storage_path: true,
        original_filename: true,
        created_at: true,
        updated_at: true,
        articleImage: true,
      },
    } satisfies Prisma.discussion_board_article_image_filesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardArticleImageFile> {
    return {
      id: input.id,
      filename: input.filename,
      file_size: input.file_size,
      mime_type: input.mime_type,
      storage_path: input.storage_path,
      original_filename: input.original_filename ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
}
