import { IDiscussionBoardAdministratorGradeChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGradeChange";
import { IDiscussionBoardAdministratorPromotionApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionApproval";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardAdministratorGradeChangeAtSummaryTransformer {
  export type Payload =
    Prisma.discussion_board_administrator_grade_changesGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        old_grade: true,
        new_grade: true,
        reason: true,
        created_at: true,
        administrator: {
          select: {
            id: true,
          },
        },
        changedByAdministrator: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.discussion_board_administrator_grade_changesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardAdministratorGradeChange.ISummary> {
    return {
      id: input.id,
      old_grade: input.old_grade,
      new_grade: input.new_grade,
      reason: input.reason,
      created_at: input.created_at.toISOString(),
      administrator: {
        id: input.administrator.id,
      },
      changedByAdministrator: {
        id: input.changedByAdministrator.id,
      },
    };
  }
}
