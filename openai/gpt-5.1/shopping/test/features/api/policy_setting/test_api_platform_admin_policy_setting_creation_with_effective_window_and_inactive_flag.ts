import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPolicySetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicySetting";

export async function test_api_platform_admin_policy_setting_creation_with_effective_window_and_inactive_flag(
  connection: api.IConnection,
) {
  // 1. Join as platform admin to obtain authorized session (Authorization header is auto-wired by SDK)
  const joinBody = {
    email: `inactive_review_admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://admin.example.com/onboarding/platform",
    referrer: "https://admin.example.com/login",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Build staged, inactive review policy payload
  const code = `inactive_review_policy_test_${RandomGenerator.alphaNumeric(6)}`;
  const now = new Date();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const effectiveFrom = new Date(now.getTime() + sevenDaysMs).toISOString();

  const createBody = {
    code,
    name: "Inactive Review Policy - Staged",
    category: "review",
    description:
      "Staged review policy for E2E tests: remains inactive until explicitly enabled.",
    config_payload:
      '{"min_review_length": 50, "auto_moderation": true, "escalation_threshold": 3}',
    active: false,
    effective_from: effectiveFrom,
    effective_to: null,
  } satisfies IShoppingMallPolicySetting.ICreate;

  // 3. Create policy setting
  const created: IShoppingMallPolicySetting =
    await api.functional.shoppingMall.platformAdmin.policySettings.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(created);

  // 4. Validate creation response semantics
  TestValidator.equals(
    "created policy code should match request",
    created.code,
    createBody.code,
  );
  TestValidator.equals(
    "created policy name should match request",
    created.name,
    createBody.name,
  );
  TestValidator.equals(
    "created policy category should match request",
    created.category,
    createBody.category,
  );
  TestValidator.equals(
    "created policy description should match request",
    created.description,
    createBody.description,
  );
  TestValidator.equals(
    "created policy config_payload should match request",
    created.config_payload,
    createBody.config_payload,
  );
  TestValidator.equals(
    "created policy should be inactive",
    created.active,
    false,
  );
  TestValidator.equals(
    "created policy effective_from should match request",
    created.effective_from,
    createBody.effective_from,
  );
  TestValidator.equals(
    "created policy effective_to should be null as requested",
    created.effective_to,
    createBody.effective_to,
  );
  TestValidator.equals(
    "created policy deleted_at should be null for new profile",
    created.deleted_at,
    null,
  );

  // 5. Re-fetch by code to confirm persistence
  const fetched: IShoppingMallPolicySetting =
    await api.functional.shoppingMall.platformAdmin.policySettings.at(
      connection,
      {
        policySettingCode: code,
      },
    );
  typia.assert(fetched);

  TestValidator.equals(
    "fetched policy id should match created id",
    fetched.id,
    created.id,
  );
  TestValidator.equals(
    "fetched policy code should match created code",
    fetched.code,
    created.code,
  );
  TestValidator.equals(
    "fetched policy should remain inactive",
    fetched.active,
    false,
  );
  TestValidator.equals(
    "fetched policy effective_from should match created",
    fetched.effective_from,
    created.effective_from,
  );
  TestValidator.equals(
    "fetched policy effective_to should remain null",
    fetched.effective_to,
    created.effective_to,
  );
  TestValidator.equals(
    "fetched policy description should match created",
    fetched.description,
    created.description,
  );
  TestValidator.equals(
    "fetched policy config_payload should match created",
    fetched.config_payload,
    created.config_payload,
  );
  TestValidator.equals(
    "fetched policy deleted_at should remain null",
    fetched.deleted_at,
    created.deleted_at,
  );
}
