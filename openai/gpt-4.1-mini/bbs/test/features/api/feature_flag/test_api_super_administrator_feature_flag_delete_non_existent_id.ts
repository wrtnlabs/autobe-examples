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

export async function test_api_super_administrator_feature_flag_delete_non_existent_id(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 2: Attempt to delete a non-existent feature flag.
  // 1. Register as a super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {},
    },
  );
  // Update connection with access token for authorization
  superAdminConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Attempt to delete a feature flag with a random UUID that does not exist
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  // 3. Expect a 404 error indicating the feature flag does not exist
  await TestValidator.httpError(
    "delete non-existent feature flag",
    404,
    async () => {
      await api.functional.discussionBoard.superAdministrator.featureFlags.erase(
        superAdminConnection,
        {
          id: nonExistentId,
        },
      );
    },
  );
}
