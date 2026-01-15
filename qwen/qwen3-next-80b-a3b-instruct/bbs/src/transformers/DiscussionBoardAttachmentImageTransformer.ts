import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IDiscussionBoardAttachmentImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentImage";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardAttachmentImageTransformer {
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
        article: true,
        citizen: true,
        discussion_board_archives: true,
        discussion_board_audit_events: true,
      },
    } satisfies Prisma.discussion_board_attachment_imagesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardAttachmentImage> {
    return {
      id: input.id,
      url: input.storage_path
        ? `${input.storage_path}/${input.id}`
        : `https://storage.example.com/images/${input.id}`,
      filename: input.filename,
      extension: input.filename.split(".").pop() || "",
      mimetype: input.mime_type,
      size: Number(input.filesize),
      width: input.width,
      height: input.height,
      uploaded_at: input.created_at.toISOString(),
      article_id: input.article.id,
      created_by: input.citizen.id,
      created_at: input.created_at.toISOString(),
      is_primary: undefined,
      is_approved: undefined,
      moderation_flags: undefined,
      report_count: undefined,
    };
  }
}
