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

export async function test_api_administrator_administrator_grade_change_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Test retrieving a specific administrator grade change by valid UUID.
  // 1. Setup super administrator actor
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminJoin = await authorize_super_administrator_join(
    superAdminConnection,
    {},
  );
  typia.assert(superAdminJoin);
  // 2. Setup administrator actor
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoin = await authorize_administrator_join(adminConnection, { body: {} });
  typia.assert(adminJoin);
  // 3. Super administrator creates an administrator grade for assignment
  const grade =
    await generate_random_discussion_board_super_administrator_administrator_grades_create(
      superAdminConnection,
      {},
    );
  typia.assert(grade);
  // 4. Promote the administrator to the newly created grade (perform promotion under superAdmin)
  // Switch to superAdminConnection; promote admin
  const promotionResult =
    await api.functional.discussionBoard.superAdministrator.administrator.promotions.createPromotion(
      superAdminConnection,
    );
  typia.assert(promotionResult);
  // 5. Create an administrator grade change record referencing the admin and the created grade
  const gradeChange =
    await generate_random_discussion_board_administrator_administrator_grade_changes_create_administrator_grade_change(
      adminConnection,
      {
        body: {
          discussion_board_administrator_id: adminJoin.id,
          discussion_board_administrator_grade_id: grade.id,
        },
      },
    );
  typia.assert(gradeChange);
  // 6. Retrieve the administrator grade change by its id
  const retrieved =
    await api.functional.discussionBoard.administrator.administrator_grade_changes.at(
      adminConnection,
      {
        gradeChangeId: gradeChange.id,
      },
    );
  typia.assert(retrieved);
  // 7. Validate response fields
  TestValidator.equals("grade change id matches", retrieved.id, gradeChange.id);
  TestValidator.equals(
    "administrator id matches",
    retrieved.administrator.id,
    adminJoin.id,
  );
  TestValidator.equals(
    "grade id matches",
    (retrieved.grade as { id: string }).id,
    grade.id,
  );
  // 8. Validate timestamps are non-empty strings
  TestValidator.predicate(
    "createdAt is valid",
    typeof retrieved.createdAt === "string" && retrieved.createdAt.length > 0,
  );
  TestValidator.predicate(
    "updatedAt is valid",
    typeof retrieved.updatedAt === "string" && retrieved.updatedAt.length > 0,
  );
  TestValidator.predicate(
    "deletedAt is null or string",
    retrieved.deletedAt === null ||
      (typeof retrieved.deletedAt === "string" &&
        retrieved.deletedAt.length > 0),
  );
}
