import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPolicySetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicySetting";

/**
 * Validate that an authenticated platform administrator can successfully create
 * a new policy setting profile with a unique business code and that the
 * response echoes the persisted configuration consistently.
 *
 * Business flow:
 *
 * 1. Join a new platform admin (POST /auth/platformAdmin/join) to obtain an
 *    authorized admin session (token is wired into the connection by SDK).
 * 2. Build a realistic IShoppingMallPolicySetting.ICreate payload for a
 *    cancellation policy profile, including code, name, category, description,
 *    JSON config_payload, active flag, and effective window.
 * 3. Call POST /shoppingMall/platformAdmin/policySettings to create the policy
 *    setting profile.
 * 4. Assert that the response is a valid IShoppingMallPolicySetting and that key
 *    fields (code, name, category, active, effective window, description,
 *    config_payload, audit timestamps, and deleted_at) satisfy expectations.
 */
export async function test_api_platform_admin_policy_setting_creation_success(
  connection: api.IConnection,
) {
  // 1. Register a platform administrator and obtain an authorized session
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(16),
    ip: "127.0.0.1",
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://shoppingmall.test/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Build a realistic policy setting creation payload
  const now = new Date();
  const effectiveFrom = now.toISOString();
  const effectiveTo = new Date(
    now.getTime() + 24 * 60 * 60 * 1000,
  ).toISOString();

  const policyCode = `default_cancellation_profile_test_${RandomGenerator.alphaNumeric(8)}`;

  const createBody = {
    code: policyCode,
    name: "Default Cancellation Policy - Test",
    category: "cancellation",
    description: RandomGenerator.paragraph({
      sentences: 6,
      wordMin: 3,
      wordMax: 8,
    }),
    config_payload: JSON.stringify({
      cancellationWindowHours: 24,
      allowPostShipmentCancellation: false,
      partialCancellationAllowed: true,
      penalties: {
        withinWindowFeePercent: 0,
        afterWindowFeePercent: 100,
      },
    }),
    active: true,
    effective_from: effectiveFrom,
    effective_to: effectiveTo,
  } satisfies IShoppingMallPolicySetting.ICreate;

  // 3. Create the policy setting profile as the authenticated platform admin
  const created: IShoppingMallPolicySetting =
    await api.functional.shoppingMall.platformAdmin.policySettings.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(created);

  // 4. Business validations on the created profile

  // ID should be a non-empty UUID string (typia.assert has already checked
  // format, but we ensure it's not an empty string for business sanity)
  TestValidator.predicate(
    "created policy setting id should be non-empty",
    created.id.length > 0,
  );

  // Core echo checks: code, name, category, active
  TestValidator.equals(
    "created.code should match requested code",
    created.code,
    createBody.code,
  );
  TestValidator.equals(
    "created.name should match requested name",
    created.name,
    createBody.name,
  );
  TestValidator.equals(
    "created.category should match requested category",
    created.category,
    createBody.category,
  );
  TestValidator.equals(
    "created.active should reflect requested active flag",
    created.active,
    createBody.active ?? true,
  );

  // Description and config payload should echo when provided
  TestValidator.equals(
    "created.description should echo requested description",
    created.description ?? null,
    createBody.description ?? null,
  );
  TestValidator.equals(
    "created.config_payload should echo requested config_payload",
    created.config_payload ?? null,
    createBody.config_payload ?? null,
  );

  // Effective window fields should be consistent with request
  TestValidator.equals(
    "created.effective_from should match requested effective_from",
    created.effective_from ?? null,
    createBody.effective_from ?? null,
  );
  TestValidator.equals(
    "created.effective_to should match requested effective_to",
    created.effective_to ?? null,
    createBody.effective_to ?? null,
  );

  // Audit timestamps should be non-null ISO 8601 strings
  TestValidator.predicate(
    "created.created_at should be a non-empty ISO date-time string",
    created.created_at.length > 0,
  );
  TestValidator.predicate(
    "created.updated_at should be a non-empty ISO date-time string",
    created.updated_at.length > 0,
  );

  // Newly created profiles should not be soft-deleted
  TestValidator.equals(
    "created.deleted_at should be null or undefined on creation",
    created.deleted_at ?? null,
    null,
  );
}
