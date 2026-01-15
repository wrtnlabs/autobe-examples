import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IDiscussionBoardThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThumbnail";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardThumbnailAtSummaryTransformer {
  export type Payload = Prisma.discussion_board_thumbnailsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        width: true,
        height: true,
        file_path: true,
        mime_type: true,
        created_at: true,
        attachment: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.discussion_board_thumbnailsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardThumbnail.ISummary> {
    return {
      id: input.id,
      url: input.file_path,
      fileSize: 0, // Placeholder: no file size field in schema, but DTO requires it
      originalWidth: input.width,
      originalHeight: input.height,
      mimeType: input.mime_type,
      uploadTimestamp: input.created_at.toISOString(),
      articleId: input.attachment.id,
    };
  }
}
