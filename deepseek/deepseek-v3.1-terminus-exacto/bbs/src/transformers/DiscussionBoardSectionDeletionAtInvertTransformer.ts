import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardSectionDeletion } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionDeletion";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardMemberAtSummaryTransformer } from "./DiscussionBoardMemberAtSummaryTransformer";
import { DiscussionBoardSectionAtSummaryTransformer } from "./DiscussionBoardSectionAtSummaryTransformer";

export namespace DiscussionBoardSectionDeletionAtInvertTransformer {
  export type Payload = Prisma.discussion_board_section_deletionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        reason: true,
        created_at: true,
        updated_at: true,
        section: DiscussionBoardSectionAtSummaryTransformer.select(),
        deletedByMember: DiscussionBoardMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.discussion_board_section_deletionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardSectionDeletion.IInvert> {
    return {
      id: input.id,
      reason: input.reason ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      section: await DiscussionBoardSectionAtSummaryTransformer.transform(
        input.section,
      ),
      deletedByMember:
        await DiscussionBoardMemberAtSummaryTransformer.transform(
          input.deletedByMember,
        ),
    };
  }
}
