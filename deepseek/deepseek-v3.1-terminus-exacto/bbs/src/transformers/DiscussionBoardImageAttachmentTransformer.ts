import { IDiscussionBoardImageAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardImageAttachment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardImageAttachmentTransformer {
  export type Payload = Prisma.discussion_board_image_attachmentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        width: true,
        height: true,
        alt_text: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        attachment: {
          select: {
            id: true,
          },
        } satisfies Prisma.discussion_board_attachmentsFindManyArgs,
        exifDatum: {
          select: {
            id: true,
          },
        } satisfies Prisma.discussion_board_image_attachment_exif_dataFindManyArgs,
      },
    } satisfies Prisma.discussion_board_image_attachmentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardImageAttachment> {
    return {
      id: input.id,
      width: input.width,
      height: input.height,
      alt_text: input.alt_text ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      discussion_board_attachment_id: input.attachment.id,
    };
  }
}
