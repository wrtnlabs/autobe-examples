import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallBusinessPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBusinessPolicy";

/**
 * Verify creation of a minimal ShoppingMall business policy by an authenticated
 * admin.
 *
 * Business goal: Ensure that an administrator who has just joined the platform
 * can register a new logical business policy definition with only the required
 * fields defined by IShoppingMallBusinessPolicy.ICreate, and that the backend
 * responds with a fully-populated IShoppingMallBusinessPolicy resource.
 *
 * Test steps:
 *
 * 1. Admin join (dependency setup)
 *
 *    - Call api.functional.auth.admin.join with a randomly generated
 *         IShoppingMallAdminJoin.ICreate payload.
 *    - This establishes an authenticated admin context and causes the SDK to set
 *         Authorization headers internally via the join implementation.
 *    - Assert the returned IShoppingMallAdmin.IAuthorized structure with
 *         typia.assert to ensure type correctness.
 * 2. Create business policy with minimal required fields
 *
 *    - Construct a body that satisfies IShoppingMallBusinessPolicy.ICreate with:
 *
 *         - Policy_code: a deterministic string, e.g. "refund_standard_policy_" +
 *                   RandomGenerator.alphaNumeric(8)
 *         - Name: a short random paragraph suitable as a label, via
 *                   RandomGenerator.paragraph({ sentences: 3 })
 *         - Category: a simple literal such as "refund" to match the scenario description
 *         - Description: omitted completely to exercise its optionality
 *         - Is_active: true, activating the policy immediately on creation
 *    - Call api.functional.shoppingMall.admin.businessPolicies.create with this
 *         body.
 *    - Assert the response using typia.assert<IShoppingMallBusinessPolicy>() to
 *         perform full schema validation.
 * 3. Business assertions on the created policy
 *
 *    - Use TestValidator.equals with descriptive titles to verify that:
 *
 *         - The response.policy_code equals the request policy_code.
 *         - The response.name equals the request name.
 *         - The response.category equals the request category.
 *         - The response.is_active equals true.
 *    - Additionally verify non-empty identifiers and lifecycle fields by simple
 *         predicates instead of format re-validation (since typia.assert
 *         already covers formats):
 *
 *         - TestValidator.predicate("business policy id is non-empty", output.id.length >
 *                   0)
 *         - TestValidator.predicate("business policy created_at present",
 *                   output.created_at.length > 0)
 *         - TestValidator.predicate("business policy updated_at present",
 *                   output.updated_at.length > 0)
 *    - For deleted_at, use TestValidator.equals("business policy deleted_at is
 *         null", output.deleted_at, null) relying on the fact that a
 *         newly-created policy should not be soft-deleted.
 *
 * Notes and constraints:
 *
 * - Do not manipulate connection.headers directly; rely on the SDK’s side effects
 *   from auth.admin.join to handle the Authorization header.
 * - Do not validate HTTP status codes explicitly; success is implied by the
 *   absence of thrown HttpError and by successful type assertions.
 * - Do not introduce any negative or error-path tests (e.g., duplicate
 *   policy_code or type mismatch scenarios). Focus solely on the happy path
 *   creation with minimal required fields.
 */
export async function test_api_business_policy_creation_with_minimal_required_fields(
  connection: api.IConnection,
) {
  // 1. Admin join: create an authenticated admin context
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create business policy with minimal required fields
  const policyCodePrefix = "refund_standard_policy_";
  const policyCodeSuffix = RandomGenerator.alphaNumeric(8);
  const policyCode = `${policyCodePrefix}${policyCodeSuffix}`;

  const policyCreateBody = {
    policy_code: policyCode,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    category: "refund",
    is_active: true,
  } satisfies IShoppingMallBusinessPolicy.ICreate;

  const createdPolicy =
    await api.functional.shoppingMall.admin.businessPolicies.create(
      connection,
      { body: policyCreateBody },
    );
  typia.assert<IShoppingMallBusinessPolicy>(createdPolicy);

  // 3. Business assertions on the created policy
  TestValidator.equals(
    "created business policy policy_code should echo request value",
    createdPolicy.policy_code,
    policyCreateBody.policy_code,
  );

  TestValidator.equals(
    "created business policy name should echo request name",
    createdPolicy.name,
    policyCreateBody.name,
  );

  TestValidator.equals(
    "created business policy category should echo request category",
    createdPolicy.category,
    policyCreateBody.category,
  );

  TestValidator.equals(
    "created business policy is_active should be true",
    createdPolicy.is_active,
    true,
  );

  TestValidator.predicate(
    "created business policy id should be non-empty string",
    createdPolicy.id.length > 0,
  );

  TestValidator.predicate(
    "created business policy created_at should be non-empty string",
    createdPolicy.created_at.length > 0,
  );

  TestValidator.predicate(
    "created business policy updated_at should be non-empty string",
    createdPolicy.updated_at.length > 0,
  );

  TestValidator.equals(
    "created business policy deleted_at should be null on creation",
    createdPolicy.deleted_at ?? null,
    null,
  );
}
