import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPolicySetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicySetting";

export async function test_api_policy_setting_update_basic_fields_by_platform_admin(
  connection: api.IConnection,
) {
  /**
   * Validate that a platform administrator can update basic mutable fields of a
   * policy setting profile by its business code.
   *
   * Flow:
   *
   * 1. Join as a platform admin (POST /auth/platformAdmin/join) to obtain an
   *    authorized admin session.
   * 2. Create an initial policy setting profile via POST
   *    /shoppingMall/platformAdmin/policySettings.
   * 3. Update mutable fields of that profile via PUT
   *    /shoppingMall/platformAdmin/policySettings/{policySettingCode}.
   * 4. Assert that immutable fields (id, code, created_at) are preserved, while
   *    mutable fields reflect the update payload and updated_at is refreshed.
   */

  // 1. Join as platform admin and establish authenticated context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create an initial policy setting profile
  const now = new Date();
  const from = new Date(now.getTime() + 1 * 60 * 60 * 1000); // +1h
  const to = new Date(now.getTime() + 24 * 60 * 60 * 1000); // +24h

  const createBody = {
    code: `policy_${RandomGenerator.alphaNumeric(12)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    category: "cancellation",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    config_payload: JSON.stringify({
      windowHours: 24,
      allowPartial: true,
    }),
    active: true,
    effective_from: from.toISOString(),
    effective_to: to.toISOString(),
  } satisfies IShoppingMallPolicySetting.ICreate;

  const created: IShoppingMallPolicySetting =
    await api.functional.shoppingMall.platformAdmin.policySettings.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(created);

  // Capture immutable / original fields for later comparison
  const originalId = created.id;
  const originalCode = created.code;
  const originalCreatedAt = created.created_at;
  const originalUpdatedAt = created.updated_at;

  // Sanity checks on creation output
  TestValidator.equals(
    "created policy code equals request code",
    created.code,
    createBody.code,
  );
  TestValidator.equals(
    "created policy category equals request category",
    created.category,
    createBody.category,
  );
  TestValidator.equals(
    "created policy active equals request active",
    created.active,
    createBody.active,
  );

  // 3. Update mutable fields using business code (policySettingCode)
  const newFrom = new Date(now.getTime() + 2 * 60 * 60 * 1000); // +2h
  const newTo = new Date(now.getTime() + 48 * 60 * 60 * 1000); // +48h

  const updateBody = {
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    category: "refund",
    config_payload: JSON.stringify({
      windowHours: 48,
      allowPartial: false,
    }),
    active: false,
    effective_from: newFrom.toISOString(),
    effective_to: newTo.toISOString(),
  } satisfies IShoppingMallPolicySetting.IUpdate;

  const updated: IShoppingMallPolicySetting =
    await api.functional.shoppingMall.platformAdmin.policySettings.update(
      connection,
      {
        policySettingCode: created.code,
        body: updateBody,
      },
    );
  typia.assert(updated);

  // 4. Assert immutable fields preserved
  TestValidator.equals(
    "updated policy id remains same as created",
    updated.id,
    originalId,
  );
  TestValidator.equals(
    "updated policy code remains same as created",
    updated.code,
    originalCode,
  );
  TestValidator.equals(
    "created_at remains unchanged after update",
    updated.created_at,
    originalCreatedAt,
  );

  // 5. Assert mutable fields updated to new values
  TestValidator.equals("policy name updated", updated.name, updateBody.name);
  TestValidator.equals(
    "policy description updated",
    updated.description ?? null,
    updateBody.description ?? null,
  );
  TestValidator.equals(
    "policy category updated",
    updated.category,
    updateBody.category,
  );
  TestValidator.equals(
    "policy config_payload updated",
    updated.config_payload ?? null,
    updateBody.config_payload ?? null,
  );
  TestValidator.equals(
    "policy active flag updated",
    updated.active,
    updateBody.active,
  );
  TestValidator.equals(
    "policy effective_from updated",
    updated.effective_from ?? null,
    updateBody.effective_from ?? null,
  );
  TestValidator.equals(
    "policy effective_to updated",
    updated.effective_to ?? null,
    updateBody.effective_to ?? null,
  );

  // 6. updated_at should be refreshed (different from original)
  TestValidator.notEquals(
    "updated_at should change after update",
    updated.updated_at,
    originalUpdatedAt,
  );
}
