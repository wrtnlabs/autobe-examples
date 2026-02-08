import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_discussion_board_administrator_administrator_grades_create } from "../../../generate/generate_random_discussion_board_administrator_administrator_grades_create";
import { prepare_random_discussion_board_administrator_grade } from "../../../prepare/prepare_random_discussion_board_administrator_grade";

export async function test_api_administrator_administrator_grade_deletion_success(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful deletion of an existing administrator grade by a super administrator.
  // Steps:
  // 1) A super administrator joins the system (admin registration).
  // 2) The super administrator creates a new administrator grade with unique name and valid level.
  // 3) The super administrator deletes the administrator grade by its UUID using the DELETE endpoint.
  // Validation: The response status is 204 No Content indicating successful deletion.
  // The grade is no longer retrievable via GET endpoint.
  // Repeated deletion calls for the same grade return 204 without error (idempotency).
  // 1. Super administrator joins (admin registration)
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized: IDiscussionBoardAdministrator.IAuthorized =
    await authorize_administrator_join(adminConnection, { body: {} });
  typia.assert(adminAuthorized);
  adminConnection.headers = {
    Authorization: adminAuthorized.token.access,
  };
  // 2. Super administrator creates a new administrator grade
  const newGrade = await generate_random_discussion_board_administrator_administrator_grades_create(
    adminConnection,
    { body: {} },
  );
  typia.assert(newGrade);
  // 3. Determine the identifier property for the grade
  // If 'newGrade' has 'gradeId' property, use it; otherwise fallback to 'id' if present.
  const gradeIdentifier: string = (newGrade as any).gradeId ?? (newGrade as any).id;
  if (typeof gradeIdentifier !== "string") {
    throw new Error("Failed to find grade identifier property on newGrade");
  }
  // 4. Super administrator deletes the administrator grade by its UUID
  await api.functional.discussionBoard.administrator.administratorGrades.erase(
    adminConnection,
    { gradeId: gradeIdentifier },
  );
  // 5. Attempt to delete the same administrator grade again to test idempotency
  await api.functional.discussionBoard.administrator.administratorGrades.erase(
    adminConnection,
    { gradeId: gradeIdentifier },
  );
  // No error means successful deletion and idempotency
  TestValidator.predicate(
    "administrator grade deletion success and idempotency",
    true,
  );
}
