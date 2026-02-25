import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test deletion attempt on non-existent business rule.
 * 1. Create admin account using join utility.
 * 2. Authenticate admin using the same credentials.
 * 3. Attempt to delete a non-existent business rule (random UUID).
 * 4. Validate 404 Not Found error response.
 */
export async function test_api_business_rules_delete_nonexistent(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin-specific connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Use utility function to join admin (creates new account)
  const joinResponse = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    },
  });
  typia.assert(joinResponse);
  // Step 2: Generate a random UUID for a non-existent rule
  const nonExistentRuleId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Attempt deletion and expect 404 error
  await TestValidator.httpError(
    "delete non-existent rule should return 404",
    404,
    async () => {
      await api.functional.ecommerce.administrator.business_rules.erase(
        adminConnection,
        {
          ruleId: nonExistentRuleId,
        },
      );
    },
  );
}
