import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardAdministratorGradeHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGradeHistory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardAdminAtSummaryTransformer } from "./DiscussionBoardAdminAtSummaryTransformer";

export namespace DiscussionBoardAdministratorGradeHistoryTransformer {
  export type Payload =
    Prisma.discussion_board_administrator_grade_historiesGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        action: true,
        previous_grade: true,
        new_grade: true,
        created_at: true,
        admin: DiscussionBoardAdminAtSummaryTransformer.select(),
        actor: DiscussionBoardAdminAtSummaryTransformer.select(),
      },
    } satisfies Prisma.discussion_board_administrator_grade_historiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardAdministratorGradeHistory> {
    return {
      id: input.id,
      action: input.action as "promotion" | "demotion",
      previous_grade: input.previous_grade as "regular" | "super",
      new_grade: input.new_grade as "regular" | "super",
      created_at: input.created_at.toISOString(),
      admin: await DiscussionBoardAdminAtSummaryTransformer.transform(
        input.admin,
      ),
      actor: await DiscussionBoardAdminAtSummaryTransformer.transform(
        input.actor,
      ),
    };
  }
}
