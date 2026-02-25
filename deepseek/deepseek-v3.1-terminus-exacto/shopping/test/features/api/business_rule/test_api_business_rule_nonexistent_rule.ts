import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformEventOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformEventOfCustomer";
import type { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

/**
 * Test retrieving a non-existent business rule as super administrator.
 * Expected behavior: API should return proper error handling for non-existent resources.
 */
export async function test_api_business_rule_nonexistent_rule(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://test.com",
        referrer: "https://test.com",
      } satisfies IEcommerceSuperAdministrator.IJoin,
    },
  );
  typia.assert(authResult);
  // Generate a deliberately invalid-but-valid-format UUID that guarantees non-existence
  // Using a UUID with specific pattern that's unlikely to collide with real data
  const nonexistentRuleId: string & tags.Format<"uuid"> =
    "00000000-0000-0000-0000-000000000000" satisfies string as string &
      tags.Format<"uuid">;
  // Attempt to retrieve the non-existent business rule and expect 404 error
  await TestValidator.httpError(
    "retrieve non-existent business rule",
    404,
    async () => {
      await api.functional.ecommerce.superAdministrator.business_rules.at(
        superAdminConnection,
        {
          ruleId: nonexistentRuleId,
        },
      );
    },
  );
}
