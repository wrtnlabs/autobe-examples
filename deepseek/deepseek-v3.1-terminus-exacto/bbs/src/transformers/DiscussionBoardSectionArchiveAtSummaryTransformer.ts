import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardSectionArchive } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionArchive";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardAdminAtSummaryTransformer } from "./DiscussionBoardAdminAtSummaryTransformer";
import { DiscussionBoardSectionAtSummaryTransformer } from "./DiscussionBoardSectionAtSummaryTransformer";

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
        section: DiscussionBoardSectionAtSummaryTransformer.select(),
      },
    } satisfies Prisma.discussion_board_section_archivesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardSectionArchive.ISummary> {
    // Load admin separately since archived_by is a scalar foreign key
    // This assumes DiscussionBoardAdminAtSummaryTransformer has a method to load by ID
    const adminPayload = {
      id: input.archived_by,
      email: "", // These would need to be loaded from database
      display_name: "",
      created_at: new Date(),
    };
    const admin =
      await DiscussionBoardAdminAtSummaryTransformer.transform(adminPayload);
    return {
      id: input.id,
      archived_at: toISOStringSafe(input.archived_at),
      reason: input.reason,
      archived_by: admin,
      section: await DiscussionBoardSectionAtSummaryTransformer.transform(
        input.section,
      ),
    };
  }
}
