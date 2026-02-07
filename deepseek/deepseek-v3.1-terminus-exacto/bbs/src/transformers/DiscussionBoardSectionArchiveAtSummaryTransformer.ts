import { IDiscussionBoardSectionArchive } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionArchive";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardSectionArchiveAtSummaryTransformer {
  export type Payload = Prisma.discussion_board_section_archivesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        archived_at: true,
        archived_by: true,
        reason: true,
        created_at: true,
        updated_at: true,
        section: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.discussion_board_section_archivesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardSectionArchive.ISummary> {
    return {
      id: input.id,
      archived_at: input.archived_at.toISOString(),
      archived_by: input.archived_by,
      reason: input.reason,
    };
  }
}
