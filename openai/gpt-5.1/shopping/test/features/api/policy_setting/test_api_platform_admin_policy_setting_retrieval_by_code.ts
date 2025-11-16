import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPolicySetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicySetting";

/**
 * Validate that a platform admin can retrieve a policy setting by its business
 * code after creating it.
 *
 * Business flow:
 *
 * 1. Join as a new platform administrator (POST /auth/platformAdmin/join).
 * 2. Create a new policy setting profile (POST
 *    /shoppingMall/platformAdmin/policySettings).
 * 3. Retrieve the same policy setting by its code (GET
 *    /shoppingMall/platformAdmin/policySettings/{policySettingCode}).
 * 4. Verify the retrieved profile matches the created one and core invariants like
 *    non-null id UUID, audit timestamps, and null deleted_at for fresh
 *    records.
 */
export async function test_api_platform_admin_policy_setting_retrieval_by_code(
  connection: api.IConnection,
) {
  // 1. Register a new platform administrator and establish auth context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://admin.shoppingmall.local/join",
    referrer: "https://shoppingmall.local/landing/platform-admin",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create a new policy setting profile
  const now = new Date();
  const effectiveFrom = new Date(now.getTime() + 60 * 60 * 1000).toISOString(); // +1 hour
  const effectiveTo = new Date(
    now.getTime() + 24 * 60 * 60 * 1000,
  ).toISOString(); // +1 day

  const createBody = {
    code: `policy_${RandomGenerator.alphaNumeric(12)}`,
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 10 }),
    category: RandomGenerator.pick([
      "cancellation",
      "refund",
      "review",
      "age_restriction",
    ] as const),
    description: RandomGenerator.paragraph({
      sentences: 8,
      wordMin: 4,
      wordMax: 12,
    }),
    config_payload: JSON.stringify({
      windowHours: 24,
      allowPartial: true,
      maxAmount: 100000,
    }),
    active: true,
    effective_from: effectiveFrom,
    effective_to: effectiveTo,
  } satisfies IShoppingMallPolicySetting.ICreate;

  const created: IShoppingMallPolicySetting =
    await api.functional.shoppingMall.platformAdmin.policySettings.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(created);

  // Business field validations on the created object
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
    "created policy active should match request",
    created.active,
    createBody.active,
  );
  TestValidator.equals(
    "created policy effective_from should match request",
    created.effective_from,
    createBody.effective_from,
  );
  TestValidator.equals(
    "created policy effective_to should match request",
    created.effective_to,
    createBody.effective_to,
  );

  // Ensure deleted_at is null for a fresh record
  TestValidator.equals(
    "created policy deleted_at must be null for fresh profile",
    created.deleted_at,
    null,
  );

  // 3. Retrieve the policy setting by its business code
  const fetched: IShoppingMallPolicySetting =
    await api.functional.shoppingMall.platformAdmin.policySettings.at(
      connection,
      {
        policySettingCode: created.code,
      },
    );
  typia.assert(fetched);

  // 4. Validate that fetched profile matches created one on business fields
  TestValidator.equals(
    "fetched policy id should equal created id",
    fetched.id,
    created.id,
  );
  TestValidator.equals(
    "fetched policy code should equal created code",
    fetched.code,
    created.code,
  );
  TestValidator.equals(
    "fetched policy name should equal created name",
    fetched.name,
    created.name,
  );
  TestValidator.equals(
    "fetched policy category should equal created category",
    fetched.category,
    created.category,
  );
  TestValidator.equals(
    "fetched policy description should equal created description",
    fetched.description,
    created.description,
  );
  TestValidator.equals(
    "fetched policy config_payload should equal created config_payload",
    fetched.config_payload,
    created.config_payload,
  );
  TestValidator.equals(
    "fetched policy active flag should equal created active flag",
    fetched.active,
    created.active,
  );
  TestValidator.equals(
    "fetched policy effective_from should equal created effective_from",
    fetched.effective_from,
    created.effective_from,
  );
  TestValidator.equals(
    "fetched policy effective_to should equal created effective_to",
    fetched.effective_to,
    created.effective_to,
  );

  // Check audit timestamps are present and consistent
  TestValidator.predicate(
    "created_at must be a non-empty ISO string",
    typeof created.created_at === "string" && created.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at must be a non-empty ISO string",
    typeof created.updated_at === "string" && created.updated_at.length > 0,
  );
  TestValidator.equals(
    "fetched created_at should equal created created_at",
    fetched.created_at,
    created.created_at,
  );
  TestValidator.equals(
    "fetched updated_at should equal created updated_at",
    fetched.updated_at,
    created.updated_at,
  );

  // Soft deletion semantics for fetched record
  TestValidator.equals(
    "fetched policy deleted_at must still be null",
    fetched.deleted_at,
    null,
  );
}
