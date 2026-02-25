import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorGradeChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGradeChange";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_discussion_board_administrator_grade_change } from "../prepare/prepare_random_discussion_board_administrator_grade_change";

export async function generate_random_discussion_board_super_admin_administrators_demote(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardAdministratorGradeChange.ICreate>;
    params?: {
      administratorId: string;
    };
  },
): Promise<IDiscussionBoardSuperAdmin> {
  const prepared: IDiscussionBoardAdministratorGradeChange.ICreate =
    prepare_random_discussion_board_administrator_grade_change(props.body);
  const result: IDiscussionBoardSuperAdmin =
    await api.functional.discussionBoard.superAdmin.administrators.demote(
      connection,
      {
        body: prepared,
        administratorId: props.params?.administratorId ?? typia.assert<string & tags.Format<"uuid">>(RandomGenerator.alphabets(36)),
      },
    );
  return result;
}