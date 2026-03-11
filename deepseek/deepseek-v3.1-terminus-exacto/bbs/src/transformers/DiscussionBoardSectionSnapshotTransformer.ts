import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardSectionSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardSectionAtSummaryTransformer } from "./DiscussionBoardSectionAtSummaryTransformer";

export namespace DiscussionBoardSectionSnapshotTransformer {
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
        section: DiscussionBoardSectionAtSummaryTransformer.select(),
      },
    } satisfies Prisma.discussion_board_section_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardSectionSnapshot> {
    return {
      id: input.id,
      name: input.name,
      description: input.description ?? null,
      created_at: input.created_at.toISOString(),
      snapshot_reason: input.snapshot_reason ?? undefined,
      section: await DiscussionBoardSectionAtSummaryTransformer.transform(
        input.section,
      ),
    };
  }
}
