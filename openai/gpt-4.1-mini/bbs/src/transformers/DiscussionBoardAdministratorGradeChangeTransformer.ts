import { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import { IDiscussionBoardAdministratorGradeChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGradeChange";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardAdministratorAtSummaryTransformer } from "./DiscussionBoardAdministratorAtSummaryTransformer";

export namespace DiscussionBoardAdministratorGradeChangeTransformer {
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
        grade: DiscussionBoardAdministratorAtSummaryTransformer.select(),
      },
    } satisfies Prisma.discussion_board_administrator_grade_changesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardAdministratorGradeChange> {
    return {
      id: input.id,
      administrator:
        await DiscussionBoardAdministratorAtSummaryTransformer.transform(
          input.administrator,
        ),
      grade: await DiscussionBoardAdministratorAtSummaryTransformer.transform(
        input.grade,
      ),
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    };
  }
}
