import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardAdministratorGradeChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGradeChange";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_discussion_board_administrator_grade_change } from "../prepare/prepare_random_discussion_board_administrator_grade_change";

export async function generate_random_discussion_board_administrator_administrator_grade_changes_create_administrator_grade_change(
  connection: api.IConnection,
  props: {
    body?:
      | DeepPartial<IDiscussionBoardAdministratorGradeChange.ICreate>
      | undefined;
  },
): Promise<IDiscussionBoardAdministratorGradeChange> {
  const prepared: IDiscussionBoardAdministratorGradeChange.ICreate =
    prepare_random_discussion_board_administrator_grade_change(props.body);
  const result: IDiscussionBoardAdministratorGradeChange =
    await api.functional.discussionBoard.administrator.administrator_grade_changes.createAdministratorGradeChange(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
