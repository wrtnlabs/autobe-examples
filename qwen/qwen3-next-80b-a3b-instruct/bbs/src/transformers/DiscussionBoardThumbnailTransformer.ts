import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IDiscussionBoardThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThumbnail";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardThumbnailTransformer {
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
        attachment: true,
      },
    } satisfies Prisma.discussion_board_thumbnailsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardThumbnail> {
    return {
      url: input.file_path,
    };
  }
}
