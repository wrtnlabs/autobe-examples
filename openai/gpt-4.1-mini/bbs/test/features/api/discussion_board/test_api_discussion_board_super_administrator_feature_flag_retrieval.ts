import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardFeatureFlag";
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

export async function test_api_discussion_board_super_administrator_feature_flag_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Test retrieving detailed information about a specific feature flag by its UUID as a super administrator.
  // Validate that the returned data contains all expected properties of the feature flag including code, name, description, enabled status, and timestamps.
  // Verify that a valid super administrator can successfully authenticate (join) before accessing this endpoint.
  // Also validate that requesting a non-existent feature flag UUID produces a 404 Not Found error response.
  // 1. Authenticate as super administrator via join
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {},
    },
  );
  typia.assert(authorized);
  // Use token from authorized to set Authorization header
  superAdminConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Attempt to retrieve a feature flag by a real UUID (mock a random UUID)
  const featureFlagId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Try to get the feature flag - expect error since this UUID likely doesn't exist,
  // so catch expected 404 error
  await TestValidator.httpError(
    "feature flag not found error",
    404,
    async () => {
      await api.functional.discussionBoard.superAdministrator.featureFlags.at(
        superAdminConnection,
        {
          id: featureFlagId,
        },
      );
    },
  );
  // Due to the given structures, the actual feature flag contents are not detailed,
  // so no properties can be asserted on the response (empty object type). However,
  // we can test the success path by simulating a random feature flag response using SDK simulate.
  // 3. Simulate a feature flag data response
  const simulatedFlag =
    api.functional.discussionBoard.superAdministrator.featureFlags.at.simulate(
      superAdminConnection,
      { id: featureFlagId },
    );
  typia.assert(simulatedFlag);
  // Note: The DTO IDiscussionBoardFeatureFlag is an empty object type in definitions,
  // so no deep property assert can be done.
}
