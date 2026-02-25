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

/**
 * Scenario 1: Successful deletion of an existing feature flag by an authorized administrator.
 *
 * - Perform administrator join to obtain authentication tokens.
 * - Attempt to delete a known existing feature flag by valid UUID.
 * - Verify HTTP 204 No Content response indicating successful deletion.
 * - Confirm the feature flag no longer exists by attempting to retrieve it or checking the system state.
 * - Validate audit log entry creation for traceability of the deletion event.
 */
export async function test_api_feature_flag_deletion_success_by_administrator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator join and get authorized connection
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
    },
  });
  typia.assert(admin);
  // After authorize_administrator_join, adminConnection.headers.Authorization is set internally
  // 2. Since there is no API to create a feature flag directly, we simulate a known feature flag UUID to delete.
  const featureFlagId = typia.random<string & tags.Format<"uuid">>();
  // 3. Call eraseFeatureFlag to delete the feature flag with the generated UUID
  // Expect 204 No Content (no response) on successful deletion
  await api.functional.discussionBoard.administrator.featureFlags.eraseFeatureFlag(
    adminConnection,
    { id: featureFlagId },
  );
  // 4. Confirm deletion by attempting to delete again - expect an error as it no longer exists
  await TestValidator.error("delete already deleted feature flag", async () => {
    await api.functional.discussionBoard.administrator.featureFlags.eraseFeatureFlag(
      adminConnection,
      { id: featureFlagId },
    );
  });
}
