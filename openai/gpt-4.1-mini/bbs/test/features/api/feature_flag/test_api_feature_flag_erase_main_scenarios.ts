import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardFeatureFlag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_discussion_board_administrator_feature_flags_create } from "../../../generate/generate_random_discussion_board_administrator_feature_flags_create";
import { prepare_random_discussion_board_feature_flag } from "../../../prepare/prepare_random_discussion_board_feature_flag";

export async function test_api_feature_flag_erase_main_scenarios(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful deletion of a feature flag
  // Scenario 2: Deletion attempt for a non-existent feature flag ID
  // Scenario 3: Unauthorized deletion attempt without administrator authentication
  // 1. Authenticate as administrator by performing join
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  typia.assert(adminAuth);
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuth.token.access}`,
  };
  // 2. Create a new feature flag
  const featureFlag =
    await generate_random_discussion_board_administrator_feature_flags_create(
      adminConnection,
      {},
    );
  typia.assert(featureFlag);
  const featureFlagId = (featureFlag as unknown as { id: string & tags.Format<"uuid"> }).id;
  // 3. Delete the created feature flag
  await api.functional.discussionBoard.administrator.featureFlags.erase(
    adminConnection,
    {
      id: featureFlagId,
    },
  );
  // 4. Confirm the feature flag no longer exists by attempting deletion again
  await TestValidator.httpError(
    "delete non-existent feature flag triggers 404",
    404,
    async () => {
      await api.functional.discussionBoard.administrator.featureFlags.erase(
        adminConnection,
        { id: featureFlagId },
      );
    },
  );
  // 5. Scenario 2: Attempt deletion of a non-existent feature flag ID
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "deletion of a non-existent feature flag returns 404",
    404,
    async () => {
      await api.functional.discussionBoard.administrator.featureFlags.erase(
        adminConnection,
        {
          id: nonExistentId,
        },
      );
    },
  );
  // 6. Scenario 3: Unauthorized deletion attempt without administrator authentication
  const anonConnection: api.IConnection = { host: connection.host };
  const anyId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "unauthorized deletion attempt returns 401",
    401,
    async () => {
      await api.functional.discussionBoard.administrator.featureFlags.erase(
        anonConnection,
        {
          id: anyId,
        },
      );
    },
  );
}
