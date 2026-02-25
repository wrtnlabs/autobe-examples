import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_feature_flag_deletion_super_administrator_authorization(
  connection: api.IConnection,
): Promise<void> {
  // Scenario Description:
  // Test deleting a feature flag by a superAdministrator with proper authorization and unauthorized attempts.
  // 1. Prepare superAdministrator connection with authorized JWT token
  const saConnection: api.IConnection = { host: connection.host };
  const saUser = await authorize_super_administrator_join(connection, {});
  saConnection.headers = { Authorization: `Bearer ${saUser.token.access}` };
  // 2. Generate a valid UUID for deletion testing
  const featureFlagId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to delete the feature flag as superAdministrator (expected to succeed or 404)
  try {
    await api.functional.discussionBoard.superAdministrator.featureFlags.eraseFeatureFlag(
      saConnection,
      {
        id: featureFlagId,
      },
    );
  } catch (exp) {
    // Error might be 404 if id not exist, or others
    if (!(exp instanceof api.HttpError)) throw exp;
    TestValidator.predicate(
      "delete feature flag 404 or 204",
      exp.status === 404 || exp.status === 204,
    );
  }
  // 4. Attempt to delete the same feature flag again as superAdministrator (expected 404 now)
  await TestValidator.error(
    "deleting non-existing feature flag throws",
    async () => {
      await api.functional.discussionBoard.superAdministrator.featureFlags.eraseFeatureFlag(
        saConnection,
        {
          id: featureFlagId,
        },
      );
    },
  );
  // 5. Attempt to delete feature flag as unauthenticated user (expect 401 or 403 error)
  await TestValidator.httpError(
    "unauthorized deletion by unauthenticated user",
    [401, 403],
    async () => {
      await api.functional.discussionBoard.superAdministrator.featureFlags.eraseFeatureFlag(
        connection,
        {
          id: featureFlagId,
        },
      );
    },
  );
}
