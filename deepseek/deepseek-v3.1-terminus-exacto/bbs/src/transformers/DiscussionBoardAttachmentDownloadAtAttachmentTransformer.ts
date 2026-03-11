import { IDiscussionBoardAttachmentDownload } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentDownload";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardAttachmentDownloadAtAttachmentTransformer {
  // 1. Payload type first
  export type Payload = Prisma.discussion_board_attachmentsGetPayload<
    ReturnType<typeof select>
  >;
  // 2. select() function second
  export function select() {
    return {
      select: {
        id: true,
        filename: true,
        filetype: true,
        mime_type: true,
        size_bytes: true,
        storage_path: true,
      },
    } satisfies Prisma.discussion_board_attachmentsFindManyArgs;
  }
  // 3. transform() function last
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardAttachmentDownload.IAttachment> {
    return {
      id: input.id,
      filename: input.filename,
      filetype: input.filetype,
      mime_type: input.mime_type,
      size_bytes: input.size_bytes,
      storage_path: input.storage_path,
    };
  }
}
