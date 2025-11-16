import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPolicySetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicySetting";

export async function test_api_policy_setting_delete_by_platform_admin(
  connection: api.IConnection,
) {
  // 1. Join as platform admin to obtain authorized session and tokens
  const joinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinRequest,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Create a new policy setting profile with a unique business code
  const policyCode: string = `e2e_policy_${RandomGenerator.alphaNumeric(12)}`;

  const createBody = {
    code: policyCode,
    name: `E2E Policy ${RandomGenerator.name(2)}`,
    category: RandomGenerator.pick([
      "cancellation",
      "refund",
      "review",
      "age_restriction",
    ] as const),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    config_payload: RandomGenerator.content({ paragraphs: 1 }),
    active: true,
    effective_from: new Date().toISOString(),
    effective_to: null,
  } satisfies IShoppingMallPolicySetting.ICreate;

  const created: IShoppingMallPolicySetting =
    await api.functional.shoppingMall.platformAdmin.policySettings.create(
      connection,
      { body: createBody },
    );
  typia.assert<IShoppingMallPolicySetting>(created);

  // Validate that the created policy uses the requested code
  TestValidator.equals(
    "created policy should have requested business code",
    created.code,
    policyCode,
  );

  // 3. Erase the policy setting by its business code (happy path)
  await api.functional.shoppingMall.platformAdmin.policySettings.erase(
    connection,
    { policySettingCode: policyCode },
  );

  // 4. Attempt to erase the same policy setting again, expecting an error
  await TestValidator.error(
    "erasing an already-deleted policy setting should fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.policySettings.erase(
        connection,
        { policySettingCode: policyCode },
      );
    },
  );
}
