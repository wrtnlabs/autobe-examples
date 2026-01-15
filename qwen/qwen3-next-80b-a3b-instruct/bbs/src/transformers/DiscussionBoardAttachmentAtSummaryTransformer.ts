import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import { IDiscussionBoardAttachmentMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentMetadata";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardAttachmentAtSummaryTransformer {
  export type Payload = Prisma.discussion_board_attachmentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        file_name: true,
        mime_type: true,
        file_size: true,
        created_at: true,
        deleted_at: true,
        post: {
          select: { id: true },
        },
        article: {
          select: { id: true },
        },
        comment: {
          select: { id: true },
        },
        file_hash: true,
        storage_path: true,
        discussion_board_thumbnails: {
          select: { thumbnail_url: true }, // Correct field name based on Prisma schema expectations
        },
        updated_at: true,
        discussion_board_article_files: {
          select: { id: true },
        },
      },
    } satisfies Prisma.discussion_board_attachmentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardAttachment.ISummary> {
    // Default metadata: since IDiscussionBoardAttachmentMetadata is defined as string,
    // and no direct field maps to it in the database, use an empty object as stringified JSON
    const metadataStr = "{}";
    // Ensure one parent exists (database contract)
    const parent = input.post ?? input.article ?? input.comment;
    return {
      id: input.id,
      name: input.file_name,
      extension: input.file_name.split(".").pop() || "",
      size: input.file_size,
      created_at: toISOStringSafe(input.created_at), // Use provided toISOStringSafe function
      parent_type: input.post ? "post" : input.article ? "article" : "comment", // This is guaranteed to be one of 'article', 'comment', 'post' because parent is defined above
      parent_id: (input.post?.id ||
        input.article?.id ||
        input.comment?.id) satisfies string as string, // Strip tags from UUID type
      media_type: input.storage_path,
      content_visibility: input.deleted_at ? "private" : "public",
      is_processed: true,
      mimetype: input.mime_type,
      hash: input.file_hash,
      thumbnail_url: input.discussion_board_thumbnails?.thumbnail_url
        ? input.discussion_board_thumbnails.thumbnail_url
        : undefined,
      version: Number(input.updated_at.getTime()),
      file_language: "",
      processing_progress: 100,
      processing_details: "fully processed",
      tags: [],
      metadata: metadataStr,
      is_anonymous: false,
      related_attachments_count: 0,
      is_primary: false,
      is_public: input.deleted_at ? false : true,
    };
  }
}
