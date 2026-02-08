import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";
import { TestValidator } from "@nestia/e2e";
import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";

export async function test_api_scheduled_task_retrieval_by_administrator_success_and_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator registration and obtain authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  typia.assert(adminAuth);
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuth.token.access}`,
  };

  // 2. Attempt to retrieve a scheduled task with a valid UUID (simulate random UUID)
  // Since we do not have create API, we rely on simulation or existing UUID
  const validUuid = typia.random<string & tags.Format<"uuid">>();

  // 3. Retrieve scheduled task with a valid UUID
  const scheduledTask = await api.functional.discussionBoard.administrator.scheduledTasks.at(
    adminConnection,
    { id: validUuid },
  );

  // 4. Assert the entire object to ensure type correctness
  typia.assert(scheduledTask);

  // 5. Attempt to retrieve with an invalid UUID - expect error
  const invalidUuid = "00000000-0000-0000-0000-000000000000"; // Assuming no such scheduled task exists
  await TestValidator.httpError(
    "error on non-existing scheduled task",
    404,
    async () => {
      await api.functional.discussionBoard.administrator.scheduledTasks.at(
        adminConnection,
        { id: invalidUuid },
      );
    },
  );
}
