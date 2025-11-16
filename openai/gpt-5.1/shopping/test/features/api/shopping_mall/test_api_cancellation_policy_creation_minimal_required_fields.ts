import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCancellationPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationPolicy";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPolicySetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicySetting";
import type { IShoppingMallRegionSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegionSetting";

export async function test_api_cancellation_policy_creation_minimal_required_fields(
  connection: api.IConnection,
) {
  /**
   * 1. Join as a new platform administrator to obtain an authorized admin session.
   * 2. Using that session, create a new cancellation policy with only the
   *    required/essential fields in IShoppingMallCancellationPolicy.ICreate,
   *    explicitly setting nullable optional fields to null to verify server
   *    handling of minimal payloads.
   * 3. Validate that the returned IShoppingMallCancellationPolicy reflects the
   *    requested fields, has server-managed identifiers/timestamps populated,
   *    and leaves optional associations/timing/configuration fields unset
   *    (null/undefined) as per their DTO definitions.
   */

  // 1. Register and authenticate a new platform admin.
  const adminJoinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    // Explicitly provide href/referrer as valid URIs, ip as null to test nullability.
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Build a minimal cancellation policy creation payload.
  const policyCode = `CNL-${RandomGenerator.alphaNumeric(12)}`;
  const policyName = RandomGenerator.name();

  const createBody = {
    code: policyCode,
    name: policyName,
    description: null,
    allow_cancellation_before_shipment: true,
    allow_partial_cancellation: false,
    max_hours_after_payment: null,
    config_payload: null,
    effective_from: null,
    effective_to: null,
    active: true,
    region_code: null,
    policy_setting_code: null,
  } satisfies IShoppingMallCancellationPolicy.ICreate;

  const createdPolicy: IShoppingMallCancellationPolicy =
    await api.functional.shoppingMall.platformAdmin.cancellationPolicies.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(createdPolicy);

  // 3. Business-level validations.
  TestValidator.equals(
    "cancellation policy code should match request",
    createdPolicy.code,
    createBody.code,
  );
  TestValidator.equals(
    "cancellation policy name should match request",
    createdPolicy.name,
    createBody.name,
  );
  TestValidator.equals(
    "allow_cancellation_before_shipment flag should be persisted",
    createdPolicy.allow_cancellation_before_shipment,
    createBody.allow_cancellation_before_shipment,
  );
  TestValidator.equals(
    "allow_partial_cancellation flag should be persisted",
    createdPolicy.allow_partial_cancellation,
    createBody.allow_partial_cancellation,
  );
  TestValidator.equals(
    "active flag should be persisted",
    createdPolicy.active,
    createBody.active,
  );

  // created_at and updated_at are already validated for type/format by typia.assert,
  // but assert they are non-empty strings for business sanity.
  TestValidator.predicate(
    "created_at must be a non-empty string",
    createdPolicy.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at must be a non-empty string",
    createdPolicy.updated_at.length > 0,
  );

  // Optional nullable fields should be null or undefined because we passed null
  // for all of them in the create body.
  TestValidator.equals(
    "description should be null when created with description: null",
    createdPolicy.description ?? null,
    createBody.description,
  );
  TestValidator.equals(
    "max_hours_after_payment should be null when created with null",
    createdPolicy.max_hours_after_payment ?? null,
    createBody.max_hours_after_payment,
  );
  TestValidator.equals(
    "config_payload should be null when created with null",
    createdPolicy.config_payload ?? null,
    createBody.config_payload,
  );
  TestValidator.equals(
    "effective_from should be null when created with null",
    createdPolicy.effective_from ?? null,
    createBody.effective_from,
  );
  TestValidator.equals(
    "effective_to should be null when created with null",
    createdPolicy.effective_to ?? null,
    createBody.effective_to,
  );

  // Associations should not be populated when no region/policy codes are given.
  TestValidator.equals(
    "region_setting should be null or undefined when region_code is null",
    createdPolicy.region_setting ?? null,
    null,
  );
  TestValidator.equals(
    "policy_setting should be null or undefined when policy_setting_code is null",
    createdPolicy.policy_setting ?? null,
    null,
  );

  // Newly created policies must not be soft-deleted.
  TestValidator.equals(
    "deleted_at should be null on newly created policy",
    createdPolicy.deleted_at ?? null,
    null,
  );
}
