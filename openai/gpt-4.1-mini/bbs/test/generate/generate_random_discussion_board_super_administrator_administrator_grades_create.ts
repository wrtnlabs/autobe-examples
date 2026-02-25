import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_discussion_board_administrator_grade } from "../prepare/prepare_random_discussion_board_administrator_grade";

export async function generate_random_discussion_board_super_administrator_administrator_grades_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardAdministratorGrade.ICreate> | undefined;
  },
): Promise<IDiscussionBoardAdministratorGrade> {
  const prepared: IDiscussionBoardAdministratorGrade.ICreate =
    prepare_random_discussion_board_administrator_grade(props.body);
  const result: IDiscussionBoardAdministratorGrade =
    await api.functional.discussionBoard.superAdministrator.administrator.grades.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
