import { IDiscussionBoardSectionFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardSectionFileTransformer {
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
        file_path: true,
        description: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        section: true,
      },
    } satisfies Prisma.discussion_board_section_filesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardSectionFile> {
    return {
      id: input.id,
      filename: input.filename,
      file_type: input.file_type,
      file_size: input.file_size,
      file_path: input.file_path,
      description: input.description ?? undefined,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
