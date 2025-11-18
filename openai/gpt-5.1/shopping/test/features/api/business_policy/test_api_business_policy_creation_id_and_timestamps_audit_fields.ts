import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallBusinessPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBusinessPolicy";

export async function test_api_business_policy_creation_id_and_timestamps_audit_fields(
  connection: api.IConnection,
) {
  // 1. Arrange: register an admin to obtain authenticated admin context.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    // keep optional ip as undefined to let backend decide
    href: "https://admin.test.shoppingmall.local/join",
    referrer: "https://admin.test.shoppingmall.local/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Act: create a new business policy.
  const createBody = {
    policy_code: `refund_standard_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    category: "refund",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_active: true,
  } satisfies IShoppingMallBusinessPolicy.ICreate;

  const created: IShoppingMallBusinessPolicy =
    await api.functional.shoppingMall.admin.businessPolicies.create(
      connection,
      { body: createBody },
    );
  typia.assert(created);

  // 3. Basic echo validations on business fields.
  TestValidator.equals(
    "policy_code should echo request payload",
    created.policy_code,
    createBody.policy_code,
  );
  TestValidator.equals(
    "name should echo request payload",
    created.name,
    createBody.name,
  );
  TestValidator.equals(
    "category should echo request payload",
    created.category,
    createBody.category,
  );
  TestValidator.equals(
    "is_active should echo request payload",
    created.is_active,
    createBody.is_active,
  );
  TestValidator.equals(
    "description should echo request payload",
    created.description ?? null,
    createBody.description ?? null,
  );

  // 4. Audit field validations.
  // 4.1 id must be a non-empty UUID-like string. Type is already validated by typia,
  // but we additionally check non-empty semantics.
  TestValidator.predicate(
    "id must be a non-empty string",
    created.id.length > 0,
  );

  // 4.2 created_at and updated_at must be ISO 8601 date-time strings parsable by Date.
  const createdAtMs = Date.parse(created.created_at);
  const updatedAtMs = Date.parse(created.updated_at);

  TestValidator.predicate(
    "created_at must be a valid ISO 8601 date-time string",
    !Number.isNaN(createdAtMs),
  );
  TestValidator.predicate(
    "updated_at must be a valid ISO 8601 date-time string",
    !Number.isNaN(updatedAtMs),
  );

  // 4.3 created_at should be less than or equal to updated_at.
  TestValidator.predicate(
    "created_at must be less than or equal to updated_at",
    createdAtMs <= updatedAtMs,
  );

  // 4.4 On initial creation, created_at and updated_at should be very close in time.
  const deltaMs = Math.abs(updatedAtMs - createdAtMs);
  const toleranceMs = 5 * 60 * 1000; // 5 minutes tolerance to avoid flaky tests.
  TestValidator.predicate(
    "created_at and updated_at should be within tolerance on creation",
    deltaMs <= toleranceMs,
  );

  // 4.5 deleted_at should be null or undefined for a newly created policy.
  TestValidator.predicate(
    "deleted_at should be null or undefined for newly created policy",
    created.deleted_at === null || created.deleted_at === undefined,
  );
}
