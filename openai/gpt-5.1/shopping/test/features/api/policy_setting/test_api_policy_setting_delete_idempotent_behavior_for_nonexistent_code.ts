import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

export async function test_api_policy_setting_delete_idempotent_behavior_for_nonexistent_code(
  connection: api.IConnection,
) {
  // 1. Bootstrap a platform administrator via join API.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
    ip: "203.0.113.10",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Prepare a policySettingCode that is virtually guaranteed not to exist.
  const policySettingCodePrefix = "nonexistent-policy-";
  const randomSuffix = RandomGenerator.alphaNumeric(24);
  const policySettingCode = `${policySettingCodePrefix}${randomSuffix}`;

  // Sanity check: ensure we generated a non-empty code.
  TestValidator.predicate(
    "generated policySettingCode must be non-empty",
    policySettingCode.length > 0,
  );

  // 3. First DELETE attempt: expect a not-found-style error for non-existent code.
  await TestValidator.error(
    "erase non-existent policy setting code should fail gracefully",
    async () => {
      await api.functional.shoppingMall.platformAdmin.policySettings.erase(
        connection,
        {
          policySettingCode,
        },
      );
    },
  );

  // 4. Second DELETE attempt with the same non-existent code to verify idempotent safe behavior.
  await TestValidator.error(
    "repeated erase on the same non-existent policy setting code should also fail and remain side-effect free",
    async () => {
      await api.functional.shoppingMall.platformAdmin.policySettings.erase(
        connection,
        {
          policySettingCode,
        },
      );
    },
  );
}
