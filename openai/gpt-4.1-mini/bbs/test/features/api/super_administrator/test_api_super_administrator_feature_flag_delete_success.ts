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

export async function test_api_super_administrator_feature_flag_delete_success(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful deletion of an existing feature flag by a super administrator. Preconditions include the super administrator has joined (registered). The test verifies the feature flag identified by a valid UUID is permanently removed from the system and that the response is empty with status 204 No Content. This verifies correct authorization and business logic for feature flag removal.
  // Create a new super administrator by joining
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {},
    },
  );
  typia.assert(authorized);
  // Update the connection headers with the received access token
  superAdminConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // Generate a random UUID for the feature flag id to delete
  const featureFlagId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to delete the feature flag by the super administrator
  // Should succeed and return no content (void)
  await api.functional.discussionBoard.superAdministrator.featureFlags.erase(
    superAdminConnection,
    { id: featureFlagId },
  );
}
