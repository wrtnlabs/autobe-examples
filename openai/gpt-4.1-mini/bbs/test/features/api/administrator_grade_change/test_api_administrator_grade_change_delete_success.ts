import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardAdministratorGradeChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGradeChange";
import type { IDiscussionBoardAdministratorPromotionResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionResult";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";
import { generate_random_discussion_board_administrator_administrator_grade_changes_create_administrator_grade_change } from "../../../generate/generate_random_discussion_board_administrator_administrator_grade_changes_create_administrator_grade_change";
import { generate_random_discussion_board_super_administrator_administrator_grades_create } from "../../../generate/generate_random_discussion_board_super_administrator_administrator_grades_create";
import { prepare_random_discussion_board_administrator_grade } from "../../../prepare/prepare_random_discussion_board_administrator_grade";
import { prepare_random_discussion_board_administrator_grade_change } from "../../../prepare/prepare_random_discussion_board_administrator_grade_change";

export async function test_api_administrator_grade_change_delete_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminJoinBody: IDiscussionBoardSuperAdministrator.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: null,
  };
  const superAdministrator = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: superAdminJoinBody,
    },
  );
  typia.assert(superAdministrator);
  // login sets authorization token header
  await authorize_super_administrator_login(superAdminConnection, {
    body: {
      email: superAdminJoinBody.email,
      password: superAdminJoinBody.password,
    },
  });
  // 2. Setup administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinBody: IDiscussionBoardAdministrator.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  };
  const administrator = await authorize_administrator_join(adminConnection, {
    body: adminJoinBody,
  });
  typia.assert(administrator);
  // login sets authorization token header
  await authorize_administrator_login(adminConnection, {
    body: {
      email: adminJoinBody.email,
      password: adminJoinBody.password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    },
  });
  // 3. Create administrator grade
  const administratorGrade =
    await generate_random_discussion_board_super_administrator_administrator_grades_create(
      superAdminConnection,
      {
        body: {
          name: `grade-${RandomGenerator.alphabets(6)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          level: 1,
        },
      },
    );
  typia.assert(administratorGrade);
  // 4. Create administrator grade change record to delete
  const gradeChangeRecord =
    await generate_random_discussion_board_administrator_administrator_grade_changes_create_administrator_grade_change(
      adminConnection,
      {
        body: {
          discussion_board_administrator_id: administrator.id,
          discussion_board_administrator_grade_id: administratorGrade.id,
        },
      },
    );
  typia.assert(gradeChangeRecord);
  // 5. Delete the grade change record
  await api.functional.discussionBoard.administrator.administrator_grade_changes.erase(
    adminConnection,
    {
      gradeChangeId: gradeChangeRecord.id,
    },
  );
  // 6. Confirm deletion by attempting to delete again which should return 404 error
  await TestValidator.error(
    "deleted administrator grade change retrieval should fail",
    async () => {
      await api.functional.discussionBoard.administrator.administrator_grade_changes.erase(
        adminConnection,
        {
          gradeChangeId: gradeChangeRecord.id,
        },
      );
    },
  );
}
