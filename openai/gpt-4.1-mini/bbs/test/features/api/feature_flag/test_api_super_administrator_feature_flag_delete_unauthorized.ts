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

export async function test_api_super_administrator_feature_flag_delete_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 3: Unauthorized deletion attempt of a feature flag by a guest or unauthenticated user.
  // This test verifies that without proper super administrator authorization, the system rejects the deletion attempt due to lack of sufficient permissions.
  // Prepare an unauthorized connection (guest, no auth headers)
  const guestConnection: api.IConnection = { host: connection.host };
  // Generate a random UUID for feature flag id to erase
  const featureFlagId = typia.random<string & tags.Format<"uuid">>();
  // Try deleting a feature flag using guestConnection (unauthenticated)
  await TestValidator.httpError(
    "unauthorized deletion attempt rejects with 401",
    401,
    async () => {
      await api.functional.discussionBoard.superAdministrator.featureFlags.erase(
        guestConnection,
        { id: featureFlagId },
      );
    },
  );
}
