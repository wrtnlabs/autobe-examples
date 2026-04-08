import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Verify that demoting a missing administrator returns not found.
 *
 * This scenario validates the administrator privilege-management flow for a nonexistent target identifier. It first authenticates a super administrator, then attempts to demote a randomly generated UUID that does not match any persisted administrator account.
 *
 * The test focuses on 1. authorization setup, 2. missing-target handling, and 3. post-failure connection integrity. It ensures the service responds with a not-found error and that the caller's authenticated state remains intact after the rejected request.
 *
 * 1. Create an isolated administrator connection and register a super administrator account.
 * 2. Call the demotion endpoint with a random UUID that does not correspond to any stored administrator.
 * 3. Assert that the operation fails with a not-found response.
 * 4. Confirm the authenticated administrator connection still carries authorization after the failed request.
 */
export async function test_api_administrator_demote_not_found(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@test.com` as string,
      password: `${RandomGenerator.alphaNumeric(12)}Aa1!` as string,
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  typia.assert(authorized);
  const missingAdministratorId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "demote missing administrator",
    404,
    async () => {
      await api.functional.mallPlatform.administrator.administrators.demote(
        adminConnection,
        {
          administratorId: missingAdministratorId,
        },
      );
    },
  );
  TestValidator.equals(
    "authorization header remains attached",
    adminConnection.headers?.Authorization,
    authorized.token.access,
  );
}
