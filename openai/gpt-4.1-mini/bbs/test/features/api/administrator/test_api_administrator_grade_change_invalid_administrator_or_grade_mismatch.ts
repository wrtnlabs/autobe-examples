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

export async function test_api_administrator_grade_change_invalid_administrator_or_grade_mismatch(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminJoinPayload = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: null,
  };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: superAdminJoinPayload,
    },
  );
  typia.assert(superAdmin);
  // 2. Create two administrator grades - regular and super
  const regularGrade =
    await generate_random_discussion_board_super_administrator_administrator_grades_create(
      superAdminConnection,
      {
        body: {
          name: `regular_${RandomGenerator.alphabets(6)}`,
          description: "Regular administrator grade",
          level: 1,
        },
      },
    );
  typia.assert(regularGrade);
  const superGrade =
    await generate_random_discussion_board_super_administrator_administrator_grades_create(
      superAdminConnection,
      {
        body: {
          name: `super_${RandomGenerator.alphabets(6)}`,
          description: "Super administrator grade",
          level: 10,
        },
      },
    );
  typia.assert(superGrade);
  // 3. Administrator joins and logs in
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminJoinPayload = {
    email: adminEmail,
    password: adminPassword,
  } satisfies IDiscussionBoardAdministrator.IJoin;
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: adminJoinPayload,
  });
  typia.assert(adminAuthorized);
  // Create new connection with admin token
  adminConnection.headers = { Authorization: adminAuthorized.token.access };
  // 4. Attempt to create grade change with non-existing administrator ID
  const nonExistingAdminId = typia.random<string & tags.Format<"uuid">>();
  const invalidGradeChangeBody1: IDiscussionBoardAdministratorGradeChange.ICreate =
    {
      discussion_board_administrator_id: nonExistingAdminId,
      discussion_board_administrator_grade_id: regularGrade.id,
    };
  await TestValidator.error(
    "invalid administrator id",
    async () =>
      await generate_random_discussion_board_administrator_administrator_grade_changes_create_administrator_grade_change(
        adminConnection,
        { body: invalidGradeChangeBody1 },
      ),
  );
  // 5. Attempt to create grade change with mismatched old grade (wrong grade id)
  // To simulate old grade mismatch, the test attempts to use superGrade id to change to regularGrade
  // but the actual administrator's current grade is regularGrade; older grade is mismatched
  const invalidGradeChangeBody2: IDiscussionBoardAdministratorGradeChange.ICreate =
    {
      discussion_board_administrator_id: adminAuthorized.id,
      discussion_board_administrator_grade_id: superGrade.id,
    };
  // The system expects the old grade to be known internally; test sends a grade id that does not match
  // Since the API spec does not receive old grade explicitly, we test the system rejecting invalid transitions by sending grade not matching actual grade
  await TestValidator.error(
    "grade mismatch on administrator",
    async () =>
      await generate_random_discussion_board_administrator_administrator_grade_changes_create_administrator_grade_change(
        adminConnection,
        { body: invalidGradeChangeBody2 },
      ),
  );
  // The test cannot specify old grade explicitly in the create API, so above covers invalid admin + invalid grade mismatch
  // Additional validation cannot be made due to API schema
}
