import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardAttachmentTransformer {
  export type Payload = Prisma.discussion_board_attachmentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        mime_type: true,
        file_size: true,
        file_name: true,
        storage_path: true,
        file_hash: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        post: {
          select: {
            id: true,
          },
        },
        article: {
          select: {
            id: true,
          },
        },
        comment: {
          select: {
            id: true,
          },
        },
        discussion_board_thumbnails: {
          select: {
            id: true,
          },
        },
        discussion_board_article_files: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.discussion_board_attachmentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardAttachment> {
    return {
      id: input.id,
      object_id:
        input.post?.id ?? input.article?.id ?? input.comment?.id ?? undefined,
      file_url: input.storage_path,
      content_type: input.mime_type,
      file_size: input.file_size,
      original_filename: input.file_name,
      attachment_type: input.mime_type.startsWith("image/")
        ? "image"
        : input.mime_type.startsWith("application/")
          ? "file"
          : "system",
      upload_date: toISOStringSafe(input.created_at),
      upload_citizen_id: typia.random<string & tags.Format<"uuid">>(),
      reported_count: 0, // Cannot be sourced from available fields
      status: input.deleted_at ? "deleted" : "active",
      is_thumbnail: false, // Cannot be sourced from available fields
    };
  }
}
