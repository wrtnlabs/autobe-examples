import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IDiscussionBoardAttachmentImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentImage";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardAttachmentImageAtSummaryTransformer {
  export type Payload = Prisma.discussion_board_attachment_imagesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        filename: true,
        filesize: true,
        width: true,
        height: true,
        mime_type: true,
        sha256_hash: true,
        storage_path: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        is_active: true,
        article: {
          select: {
            id: true,
          },
        },
        citizen: {
          select: {
            id: true,
          },
        },
        discussion_board_archives: {
          select: {
            id: true,
          },
        },
        discussion_board_audit_events: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.discussion_board_attachment_imagesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardAttachmentImage.ISummary> {
    return {
      id: input.id,
      url: input.storage_path,
      filename: input.filename,
      filesize: input.filesize,
      mimetype: input.mime_type,
      upload_timestamp: toISOStringSafe(input.created_at),
      is_active: input.is_active,
      article_id: input.article.id,
    };
  }
}
