import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardFeatureFlag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_discussion_board_feature_flag_retrieve_with_authorization(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successfully retrieve details of an existing feature flag by its UUID
  // Note: Since no creation or listing API exists for feature flags, we use a random UUID,
  // which may or may not exist in the system. In a real environment, this should be replaced
  // by a known existing UUID for reliable testing.
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, { body: {} });
  const existingId = typia.random<string>();
  try {
    const featureFlag =
      await api.functional.discussionBoard.administrator.featureFlags.at(
        adminConnection,
        { id: existingId },
      );
    typia.assert(featureFlag);
    // Removed check for featureFlag.enabled because it does not exist on IDiscussionBoardFeatureFlag
  } catch (exp) {
    // If not found, fail Scenario 1 explicitly
    throw new Error(
      `Scenario 1 failed: Feature flag with id ${existingId} not found. ` +
        `Please provide an existing feature flag UUID for testing.`,
    );
  }
  // Scenario 2: Attempt to retrieve a feature flag with a non-existent UUID
  const nonExistentId = typia.random<string>();
  await TestValidator.httpError(
    "retrieve non existent feature flag",
    [404],
    async () => {
      await api.functional.discussionBoard.administrator.featureFlags.at(
        adminConnection,
        { id: nonExistentId },
      );
    },
  );
  // Scenario 3: Unauthorized access without administrator authentication
  await TestValidator.httpError(
    "unauthorized feature flag retrieval",
    [401, 403],
    async () => {
      await api.functional.discussionBoard.administrator.featureFlags.at(
        connection,
        { id: existingId },
      );
    },
  );
}
