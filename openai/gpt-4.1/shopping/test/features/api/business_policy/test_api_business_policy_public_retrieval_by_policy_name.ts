import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingBusinessPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingBusinessPolicy";

/**
 * Validate unauthenticated public access to shopping business policy retrieval
 * by policyName.
 *
 * 1. Generate a random IShoppingBusinessPolicy object (simulating active policy in
 *    the database)
 * 2. Retrieve the policy detail using GET /shopping/businessPolicies/{policyName}
 *    as an unauthenticated client
 * 3. Confirm the returned policy details match the generated (simulated stored)
 *    record
 * 4. Validate all fields for correct type and business logic
 * 5. Check that policyName is case-insensitive (by changing case and re-querying)
 * 6. Attempt to retrieve a non-existent policyName and confirm error is raised
 * 7. Attempt to retrieve a policyName of a soft-deleted (deleted_at != null)
 *    policy and confirm error is raised
 */
export async function test_api_business_policy_public_retrieval_by_policy_name(
  connection: api.IConnection,
) {
  // 1. Simulate existing, active business policy
  const activePolicy: IShoppingBusinessPolicy =
    typia.random<IShoppingBusinessPolicy>();
  activePolicy.active = true;
  activePolicy.deleted_at = null;
  // 2. Retrieve by exact policy_name (should succeed)
  const found: IShoppingBusinessPolicy =
    await api.functional.shopping.businessPolicies.at(connection, {
      policyName: activePolicy.policy_name,
    });
  typia.assert(found);
  // 3. Validate all fields match
  TestValidator.equals(
    "all policy fields match",
    found,
    activePolicy,
    (k) =>
      k === "created_at" ||
      k === "updated_at" ||
      k === "deleted_at" ||
      k === "id",
  );
  // 4. Retrieve by uppercased policy_name (should succeed if API is case-insensitive)
  const foundCase: IShoppingBusinessPolicy =
    await api.functional.shopping.businessPolicies.at(connection, {
      policyName: activePolicy.policy_name.toUpperCase(),
    });
  typia.assert(foundCase);
  TestValidator.equals(
    "case-insensitive match",
    foundCase.policy_name.toLowerCase(),
    activePolicy.policy_name.toLowerCase(),
  );
  // 5. Attempt to retrieve non-existent policy
  await TestValidator.error("retrieve non-existent policyName", async () => {
    await api.functional.shopping.businessPolicies.at(connection, {
      policyName: RandomGenerator.alphaNumeric(20),
    });
  });
  // 6. Simulate soft-deleted policy
  const deletedPolicy: IShoppingBusinessPolicy = {
    ...typia.random<IShoppingBusinessPolicy>(),
    active: false,
    deleted_at: new Date().toISOString(),
  };
  // 7. Retrieving deleted policyName must fail (simulate with its policy_name)
  await TestValidator.error("retrieve deleted policyName", async () => {
    await api.functional.shopping.businessPolicies.at(connection, {
      policyName: deletedPolicy.policy_name,
    });
  });
}
