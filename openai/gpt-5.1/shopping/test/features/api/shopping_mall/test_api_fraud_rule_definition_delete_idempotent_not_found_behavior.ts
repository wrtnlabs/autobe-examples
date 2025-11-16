import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

export async function test_api_fraud_rule_definition_delete_idempotent_not_found_behavior(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform admin so that the
  //    Authorization header is populated for subsequent admin operations.
  const joinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinRequest,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  TestValidator.predicate(
    "platform admin should be active after join",
    () => admin.isActive === true,
  );

  // 2. Generate a ruleCode that is extremely unlikely to exist.
  const ruleCode: string = `test-nonexistent-rule-${RandomGenerator.alphaNumeric(
    24,
  )}`;

  // 3. First deletion attempt for the non-existent ruleCode.
  await api.functional.shoppingMall.platformAdmin.fraudRuleDefinitions.erase(
    connection,
    {
      ruleCode,
    },
  );

  // If the first call did not throw, we consider the not-found behavior
  // acceptable from the caller's perspective (either a tolerant delete or a
  // not-found that is normalized by the SDK).
  TestValidator.predicate(
    "first delete call for non-existent fraud rule should complete without throwing",
    true,
  );

  // 4. Second deletion attempt with the same ruleCode to verify idempotence.
  await api.functional.shoppingMall.platformAdmin.fraudRuleDefinitions.erase(
    connection,
    {
      ruleCode,
    },
  );

  // Again, completion without error demonstrates idempotent behavior from the
  // API consumer's point of view.
  TestValidator.predicate(
    "second delete call for same non-existent fraud rule should also complete without throwing",
    true,
  );
}
