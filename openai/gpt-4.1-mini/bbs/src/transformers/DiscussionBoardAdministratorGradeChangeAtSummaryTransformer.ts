import { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import { IDiscussionBoardAdministratorGradeChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGradeChange";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardAdministratorAtSummaryTransformer } from "./DiscussionBoardAdministratorAtSummaryTransformer";

export namespace DiscussionBoardAdministratorGradeChangeAtSummaryTransformer {
  export type Payload =
    Prisma.discussion_board_administrator_grade_changesGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        administrator:
          DiscussionBoardAdministratorAtSummaryTransformer.select(),
        grade: {
          select: {
            id: true,
            name: true,
            level: true,
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
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at:
        input.deleted_at === null ? null : toISOStringSafe(input.deleted_at),
      administrator:
        await DiscussionBoardAdministratorAtSummaryTransformer.transform(
          input.administrator,
        ),
      grade: {
        id: input.grade.id,
        name: input.grade.name,
        level: input.grade.level,
      },
    };
  }
}
