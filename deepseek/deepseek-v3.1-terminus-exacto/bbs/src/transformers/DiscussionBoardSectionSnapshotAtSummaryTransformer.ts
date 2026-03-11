import { IDiscussionBoardSectionSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardSectionSnapshotAtSummaryTransformer {
  export type Payload = Prisma.discussion_board_section_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        created_at: true,
        snapshot_reason: true,
        section: {
          select: {
            id: true,
          },
        } satisfies Prisma.discussion_board_sectionsFindManyArgs,
      },
    } satisfies Prisma.discussion_board_section_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardSectionSnapshot.ISummary> {
    return {
      id: input.id,
      name: input.name,
      created_at: input.created_at.toISOString(),
      snapshot_reason: input.snapshot_reason ?? null,
    };
  }
}
