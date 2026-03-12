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
        section_created_at: true,
        section_updated_at: true,
        created_at: true,
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
      description: input.description,
      section_created_at: input.section_created_at.toISOString(),
      section_updated_at: input.section_updated_at.toISOString(),
      created_at: input.created_at.toISOString(),
      section: await DiscussionBoardSectionAtSummaryTransformer.transform(
        input.section,
      ),
    };
  }
}
