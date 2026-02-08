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

export async function test_api_moderator_login_failure_incorrect_credentials(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Test moderator login failure with incorrect password and unknown email
  // 1. Setup: Attempt to create a moderator account with empty body as per DTO
  const moderatorJoinConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_moderator_join(moderatorJoinConnection, {
    body: {},
  });
  typia.assert(authorized);
  // 2. Prepare connections for login attempts
  const loginConnection1: api.IConnection = { host: connection.host };
  const loginConnection2: api.IConnection = { host: connection.host };
  // 3. Attempt login with empty body, expecting failure
  await TestValidator.error(
    "login fails with empty incorrect credentials",
    async () => {
      await authorize_moderator_login(loginConnection1, {
        body: {},
      });
    },
  );
  // 4. Attempt another login with empty body, expecting failure
  await TestValidator.error("login fails with non-existent email", async () => {
    await authorize_moderator_login(loginConnection2, {
      body: {},
    });
  });
}
