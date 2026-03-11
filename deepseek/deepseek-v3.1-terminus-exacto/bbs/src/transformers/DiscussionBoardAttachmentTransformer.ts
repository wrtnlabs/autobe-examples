import { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardAttachmentTransformer {
  export type Payload = Prisma.discussion_board_attachmentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        filename: true,
        filetype: true,
        mime_type: true,
        size_bytes: true,
        storage_path: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        article: {
          select: {
            id: true,
          },
        } satisfies Prisma.discussion_board_articlesFindManyArgs,
        snapshots: {
          select: {
            id: true,
          },
        } satisfies Prisma.discussion_board_attachment_snapshotsFindManyArgs,
        imageMetadatum: {
          select: {
            id: true,
          },
        } satisfies Prisma.discussion_board_image_attachmentsFindManyArgs,
        downloads: {
          select: {
            id: true,
          },
        } satisfies Prisma.discussion_board_attachment_downloadsFindManyArgs,
        categoryMappings: {
          select: {
            id: true,
          },
        } satisfies Prisma.discussion_board_attachment_category_mappingsFindManyArgs,
        thumbnails: {
          select: {
            id: true,
          },
        } satisfies Prisma.discussion_board_attachment_thumbnailsFindManyArgs,
      },
    } satisfies Prisma.discussion_board_attachmentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardAttachment> {
    return {
      id: input.id,
      filename: input.filename,
      filetype: input.filetype,
      mime_type: input.mime_type,
      size_bytes: input.size_bytes,
      storage_path: input.storage_path,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      article_id: input.article.id,
    };
  }
}
