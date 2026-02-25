import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdministratorGradeChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGradeChange";
import { TestValidator } from "@nestia/e2e";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";

export async function test_api_administrator_grade_change_update_successful(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup administrator join and get authorized admin connection
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const authorizedAdmin = await authorize_administrator_join(
    adminJoinConnection,
    { body: {} },
  );
  typia.assert(authorizedAdmin);
  const adminConnection: api.IConnection = { host: connection.host };
  adminConnection.headers = { Authorization: authorizedAdmin.token.access };

  // 2. Prepare update data with valid administrator ID and grade ID (random UUIDs)
  const updateBody: IDiscussionBoardAdministratorGradeChange.IUpdate = {
    discussion_board_administrator_id: typia.random<
      string & tags.Format<"uuid">
    >(),
    discussion_board_administrator_grade_id: typia.random<
      string & tags.Format<"uuid">
    >(),
  };

  // 3. Create a valid gradeChangeId (simulate random valid UUID)
  const validGradeChangeId = typia.random<string & tags.Format<"uuid">>();

  // 4. Call updateAdministratorGradeChange with valid data
  const updatedGradeChangeRaw =
    await api.functional.discussionBoard.administrator.administrator_grade_changes.updateAdministratorGradeChange(
      adminConnection,
      {
        gradeChangeId: validGradeChangeId,
        body: updateBody,
      },
    );

  // 5. Cast grade property to expected type to access id properly
  const updatedGradeChange = {
    ...updatedGradeChangeRaw,
    grade: typia.assert<{ id: string }>(updatedGradeChangeRaw.grade),
  };

  typia.assert(updatedGradeChange);

  // Validate updated fields reflect changes
  TestValidator.equals(
    "administrator ID updated",
    updatedGradeChange.administrator.id,
    updateBody.discussion_board_administrator_id,
  );
  TestValidator.equals(
    "administrator grade ID updated",
    updatedGradeChange.grade.id,
    updateBody.discussion_board_administrator_grade_id,
  );

  // Validate timestamps exist and are ISO 8601 date-time strings
  TestValidator.predicate(
    "createdAt is valid date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}.*Z$/.test(
      updatedGradeChange.createdAt,
    ),
  );
  TestValidator.predicate(
    "updatedAt is valid date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}.*Z$/.test(
      updatedGradeChange.updatedAt,
    ),
  );

  // 6. Test 404 error for invalid gradeChangeId
  await TestValidator.httpError(
    "update with invalid gradeChangeId returns 404",
    404,
    async () => {
      await api.functional.discussionBoard.administrator.administrator_grade_changes.updateAdministratorGradeChange(
        adminConnection,
        {
          gradeChangeId: typia.random<string & tags.Format<"uuid">>(),
          body: updateBody,
        },
      );
    },
  );
}
