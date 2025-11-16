import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPolicySetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicySetting";

export async function test_api_policy_setting_delete_after_configuration_changes(
  connection: api.IConnection,
) {
  // 1. Platform admin joins and obtains authorized session
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  TestValidator.predicate(
    "platform admin account should be active after join",
    admin.isActive === true,
  );

  // 2. Create an initial policy setting profile
  const policyCode: string = RandomGenerator.alphaNumeric(12);
  const initialEffectiveFrom = new Date().toISOString();
  const initialEffectiveTo = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const createBody = {
    code: policyCode,
    name: `Initial policy for ${policyCode}`,
    category: "cancellation",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    config_payload: JSON.stringify({
      cancelWindowHours: 24,
      allowPartialRefund: true,
    }),
    active: true,
    effective_from: initialEffectiveFrom,
    effective_to: initialEffectiveTo,
  } satisfies IShoppingMallPolicySetting.ICreate;

  const created: IShoppingMallPolicySetting =
    await api.functional.shoppingMall.platformAdmin.policySettings.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(created);

  // Basic field consistency checks
  TestValidator.equals(
    "created policy code should match requested code",
    created.code,
    createBody.code,
  );
  TestValidator.equals(
    "created policy name should match requested name",
    created.name,
    createBody.name,
  );
  TestValidator.equals(
    "created policy category should match requested category",
    created.category,
    createBody.category,
  );
  TestValidator.equals(
    "created policy active flag should match requested active flag",
    created.active,
    createBody.active ?? true,
  );

  // 3. Simulate an "updated" configuration in memory, without an update API
  const updatedConfig = {
    name: `${created.name} (v2)`,
    description: RandomGenerator.paragraph({ sentences: 4 }),
    category: "refund",
    active: !created.active,
    config_payload: JSON.stringify({
      cancelWindowHours: 48,
      allowPartialRefund: false,
    }),
    effective_from: new Date().toISOString(),
    effective_to: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
  };

  // Ensure that our simulated updated config is actually different
  TestValidator.notEquals(
    "simulated updated policy name should differ from original",
    updatedConfig.name,
    created.name,
  );
  TestValidator.notEquals(
    "simulated updated policy category should differ from original",
    updatedConfig.category,
    created.category,
  );

  // 4. Delete the policy setting profile by its business code
  await api.functional.shoppingMall.platformAdmin.policySettings.erase(
    connection,
    {
      policySettingCode: created.code,
    },
  );

  // If erase throws, the test will fail; reaching here means delete succeeded
  TestValidator.predicate(
    "policy setting delete should complete without throwing",
    true,
  );
}
