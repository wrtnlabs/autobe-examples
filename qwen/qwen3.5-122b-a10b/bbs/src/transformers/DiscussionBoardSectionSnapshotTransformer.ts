import { IDiscussionBoardSectionSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

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
        section_created_at: true,
        section_updated_at: true,
        section_deleted_at: true,
        captured_at: true,
        discussionBoardSection: {
          select: {
            id: true,
          },
        } satisfies Prisma.discussion_board_sectionsFindManyArgs,
      },
    } satisfies Prisma.discussion_board_section_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardSectionSnapshot> {
    return {
      id: input.id,
      discussion_board_section_id: input.discussionBoardSection.id,
      name: input.name,
      description: input.description ?? null,
      section_created_at: input.section_created_at.toISOString(),
      section_updated_at: input.section_updated_at.toISOString(),
      section_deleted_at: input.section_deleted_at?.toISOString() ?? null,
      captured_at: input.captured_at.toISOString(),
    };
  }
}
