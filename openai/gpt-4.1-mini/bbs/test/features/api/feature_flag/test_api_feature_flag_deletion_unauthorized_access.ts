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

export async function test_api_feature_flag_deletion_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 2: Unauthorized attempt to delete a feature flag without administrator privileges.
  // - Attempt to delete a feature flag using an unauthorized account or no authentication.
  // - Validate that the response returns HTTP 401 Unauthorized or HTTP 403 Forbidden.
  // - Confirm that the feature flag remains intact and no audit log is created for unauthorized attempts.
  // Create an admin connection and join (prerequisite for admin auth, but we won't use this connection for deletion to simulate unauthorized)
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "StrongP@ssw0rd123",
  } satisfies IDiscussionBoardAdministrator.IJoin;
  // Authorize administrator join to have admin user ready (though not used for deletion)
  await authorize_administrator_join(adminConnection, { body: adminJoinBody });
  // Generate a random feature flag id to attempt deletion
  const featureFlagId = typia.random<string & tags.Format<"uuid">>();
  // Attempt deletion with base connection (no auth)
  await TestValidator.httpError(
    "delete feature flag without authentication returns 401 or 403",
    [401, 403],
    async () => {
      await api.functional.discussionBoard.administrator.featureFlags.eraseFeatureFlag(
        connection,
        { id: featureFlagId },
      );
    },
  );
  // Attempt deletion with a fake unauthorized user connection (simulate unauthorized token)
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  unauthorizedConnection.headers = { Authorization: "Bearer fake.token.value" };
  await TestValidator.httpError(
    "delete feature flag with unauthorized token returns 401 or 403",
    [401, 403],
    async () => {
      await api.functional.discussionBoard.administrator.featureFlags.eraseFeatureFlag(
        unauthorizedConnection,
        { id: featureFlagId },
      );
    },
  );
}
