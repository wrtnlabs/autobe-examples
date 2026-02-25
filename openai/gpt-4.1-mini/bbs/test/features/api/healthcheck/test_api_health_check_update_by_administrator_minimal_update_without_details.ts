import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardHealthCheck } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardHealthCheck";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_discussion_board_administrator_health_checks_create } from "../../../generate/generate_random_discussion_board_administrator_health_checks_create";
import { prepare_random_discussion_board_health_check } from "../../../prepare/prepare_random_discussion_board_health_check";

export async function test_api_health_check_update_by_administrator_minimal_update_without_details(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator joins and obtains authorized connection
  const adminConnection: api.IConnection = { host: connection.host };
  const administrator = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "supersecretpassword",
    },
  });
  typia.assert(administrator);
  // 2. Create initial health check record using generation utility
  const initialHealthCheck =
    await generate_random_discussion_board_administrator_health_checks_create(
      adminConnection,
      {
        body: {
          status: "OK",
          checkedAt: new Date().toISOString(),
          details: "Initial system health check details.",
        },
      },
    );
  typia.assert(initialHealthCheck);
  // 3. Prepare minimal update body for health check by omitting details (set to null)
  const updatedAt = new Date();
  const updateBody: IDiscussionBoardHealthCheck.IUpdate = {
    status: "OK",
    checkedAt: new Date(updatedAt.getTime() - 1000 * 60).toISOString(), // earlier checkedAt
    details: null, // explicitly omitted
    updatedAt: updatedAt.toISOString(),
  };
  // 4. Perform update operation
  const updatedHealthCheck =
    await api.functional.discussionBoard.administrator.healthChecks.updateHealthCheck(
      adminConnection,
      {
        id: initialHealthCheck.id,
        body: updateBody,
      },
    );
  typia.assert(updatedHealthCheck);
  // 5. Validate update reflects input fields except for auto-updated timestamps
  TestValidator.equals(
    "status updated",
    updatedHealthCheck.status,
    updateBody.status,
  );
  TestValidator.equals(
    "checkedAt updated",
    updatedHealthCheck.checkedAt,
    updateBody.checkedAt,
  );
  TestValidator.equals("details is null", updatedHealthCheck.details, null);
  // 6. Validate timestamps
  TestValidator.predicate(
    "updatedAt is a valid ISO date string",
    () => !isNaN(Date.parse(updatedHealthCheck.updatedAt)),
  );
  TestValidator.predicate(
    "updatedAt is equal or after updatedAt in request",
    () =>
      new Date(updatedHealthCheck.updatedAt) >= new Date(updateBody.updatedAt!),
  );
  // 7. Verify immutable fields preserved
  TestValidator.equals(
    "id preserved",
    updatedHealthCheck.id,
    initialHealthCheck.id,
  );
  TestValidator.equals(
    "createdAt preserved",
    updatedHealthCheck.createdAt,
    initialHealthCheck.createdAt,
  );
}
