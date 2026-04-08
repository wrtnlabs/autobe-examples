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
 * Verify administrator detail lookup fails with not-found for a missing UUID.
 *
 * This test covers the administrator detail endpoint's negative lookup path.
 * It first provisions an administrator account so the caller has the expected
 * privilege context, then requests a randomly generated administrator UUID
 * that should not exist in the system.
 *
 * The scenario validates that the endpoint is bound strictly to the requested
 * identifier and that a missing record is rejected as not found instead of
 * returning unrelated administrator data or a partial response.
 *
 * 1. Register an administrator account through the dedicated auth utility.
 * 2. Call the administrator detail endpoint with a non-existent UUID.
 * 3. Assert that the request fails with a not-found HTTP error.
 */
export async function test_api_administrator_account_retrieve_not_found(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const missingAdministratorId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "missing administrator should return not found",
    404,
    async () => {
      await api.functional.mallPlatform.administrator.administrators.at(
        administratorConnection,
        {
          administratorId: missingAdministratorId,
        },
      );
    },
  );
}
