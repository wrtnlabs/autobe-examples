import { IDiscussionBoardSectionFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardSectionFileAtSummaryTransformer {
  export type Payload = Prisma.discussion_board_section_filesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        filename: true,
        file_type: true,
        file_size: true,
        description: true,
        file_path: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        section: false,
      },
    } satisfies Prisma.discussion_board_section_filesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardSectionFile.ISummary> {
    return {
      id: input.id,
      filename: input.filename,
      file_type: input.file_type,
      file_size: input.file_size,
      description: input.description ?? undefined,
    };
  }
}
