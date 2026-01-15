import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardArticleFileTransformer {
  export type Payload = Prisma.discussion_board_article_filesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        file_name: true,
        uploaded_at: true,
        deleted_at: true,
        article: {
          select: {
            id: true,
          },
        },
        attachment: {
          select: {
            extension: true,
            file_size: true,
            content_type: true,
            storage_uri: true,
            uploaded_by: true,
            is_processed: true,
            is_active: true,
            thumbnail_uri: true,
            width: true,
            height: true,
          },
        },
      },
    } satisfies Prisma.discussion_board_article_filesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardArticleFile> {
    return {
      id: input.id,
      article_id: input.article.id,
      file_name: input.file_name,
      file_extension: input.attachment.extension,
      file_size: input.attachment.file_size,
      content_type: input.attachment.content_type,
      storage_uri: input.attachment.storage_uri,
      uploaded_by: input.attachment.uploaded_by,
      uploaded_at: toISOStringSafe(input.uploaded_at),
      is_processed: input.attachment.is_processed,
      is_active: input.attachment.is_active,
      thumbnail_uri: input.attachment.thumbnail_uri ?? null,
      width: input.attachment.width ?? null,
      height: input.attachment.height ?? null,
    };
  }
}
