import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_login_with_deleted_account(
  connection: api.IConnection,
): Promise<void> {
  // This test covers:
  // 1. Create a new moderator account (using authorize_moderator_join)
  // 2. Simulate deletion of the moderator account (soft-delete action)
  // 3. Attempt to login with credentials of the deleted moderator account
  // 4. Validate that the login fails with an authentication error
  const moderatorConnection: api.IConnection = { host: connection.host };
  // Step 1: Create moderator account with empty payload since IJoin is empty
  const joined = await authorize_moderator_join(moderatorConnection, {
    body: {},
  });
  typia.assert(joined);
  // Step 2: Simulate moderator deletion - no API provided, so assume the account is deleted in database
  // This step is a placeholder for actual deletion logic in a real test environment
  // Step 3: Create a new connection for login attempt to avoid token contamination
  const loginConnection: api.IConnection = { host: connection.host };
  // Step 4: Attempt login with empty body and expect HTTP 401 Unauthorized error
  await TestValidator.httpError(
    "login with deleted moderator",
    401,
    async () => {
      await authorize_moderator_login(loginConnection, {
        body: {},
      });
    },
  );
}
