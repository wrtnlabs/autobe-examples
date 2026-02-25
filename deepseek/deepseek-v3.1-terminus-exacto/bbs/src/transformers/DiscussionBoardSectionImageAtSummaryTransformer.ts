import { IDiscussionBoardSectionImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardSectionImageAtSummaryTransformer {
  export type Payload = Prisma.discussion_board_section_imagesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        filename: true,
        mime_type: true,
        file_size: true,
        width: true,
        height: true,
        image_type: true,
        storage_path: true,
        alt_text: true,
      },
    } satisfies Prisma.discussion_board_section_imagesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardSectionImage.ISummary> {
    return {
      id: input.id,
      filename: input.filename,
      mime_type: input.mime_type,
      file_size: input.file_size,
      width: input.width,
      height: input.height,
      image_type: input.image_type,
      alt_text: input.alt_text ?? null,
    };
  }
}
