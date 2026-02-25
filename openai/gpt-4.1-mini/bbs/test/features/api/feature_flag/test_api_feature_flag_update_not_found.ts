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

export async function test_api_feature_flag_update_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Test updating a non-existent feature flag by superAdministrator
  // 1. Authenticate as superAdministrator.
  // 2. Attempt to update a feature flag with a random UUID not present in system.
  // 3. Expect 404 Not Found error.
  // Authorize superAdministrator join (registration)
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {},
  );
  // Set authorization header for subsequent requests
  superAdminConnection.headers = {
    Authorization: superAdmin.token.access,
  };
  // Generate random UUID for non-existent feature flag
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  // Prepare update body with random or sample data
  const updateBody: IDiscussionBoardFeatureFlag.IUpdate = {
    name: "Updated Feature Flag Name",
    enabled: true,
  };
  // Attempt update and expect HttpError 404
  await TestValidator.httpError(
    "update non-existing feature flag should fail with 404",
    404,
    async () => {
      await api.functional.discussionBoard.superAdministrator.featureFlags.update(
        superAdminConnection,
        {
          id: nonExistentId,
          body: updateBody,
        },
      );
    },
  );
}
