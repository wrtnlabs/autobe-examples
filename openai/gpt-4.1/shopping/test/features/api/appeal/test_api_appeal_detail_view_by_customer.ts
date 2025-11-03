import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAdminSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdminSuspension";
import type { IShoppingAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAppeal";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingBusinessPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingBusinessPolicy";
import type { IShoppingCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCustomer";
import type { IShoppingPolicyViolation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingPolicyViolation";

/**
 * Validate retrieval of appeal detail by customer.
 *
 * This test simulates a customer end-to-end journey:
 *
 * 1. Register a new customer (with randomized data, including email, password,
 *    name, phone, href, referrer).
 * 2. (FORCED) Create a mock appeal record via direct line (since create API is
 *    unavailable; simulate via random data and retrieval only by UUID).
 * 3. Retrieve the appeal detail using the customer session and appealId (simulate
 *    by random UUID—SDK provides typia.random<IShoppingAppeal> to mock data as
 *    needed; in real API suite, would use actual creation endpoint and
 *    relationship to logged-in user).
 * 4. Assert the returned appeal structure matches IShoppingAppeal, all
 *    business-critical properties (reason, status, decision, actors, evidence,
 *    audit_history, created_at, updated_at, etc.) exist and are valid by
 *    typia.assert.
 * 5. As negative case, check that accessing a different random appealId returns
 *    not found or forbidden (simulate by random UUID or logic below; just
 *    validate business response is error). Authorization enforcement and
 *    not-found logic can only be simulated—actual API will enforce via
 *    RBAC/ownership.
 */
export async function test_api_appeal_detail_view_by_customer(
  connection: api.IConnection,
) {
  // Step 1: Customer registration
  const customerInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    href: "https://test.com/appeal" + RandomGenerator.alphaNumeric(6),
    referrer: "https://referrer.com/page/" + RandomGenerator.alphaNumeric(4),
  } satisfies IShoppingCustomer.ICreate;
  const customer = await api.functional.auth.customer.join(connection, {
    body: customerInput,
  });
  typia.assert(customer);
  const customerId = customer.id;

  // Step 2 & 3: (Simulate appeal - API for creation is not available)
  // For e2e purposes, pick a random appealId and simulate getting its data
  // In production this would be the result of an appeal create by this customer
  const simulatedAppeal: IShoppingAppeal = typia.random<IShoppingAppeal>();
  // Override the appeal to match this customer's ID and actor
  simulatedAppeal.filer_actor_type = "customer";
  simulatedAppeal.filer_actor_id = customerId;

  // Step 4: Retrieve appeal by id and assert structure
  const output = await api.functional.shopping.customer.appeals.at(connection, {
    appealId: simulatedAppeal.id,
  });
  typia.assert(output);
  TestValidator.equals("appeal id equality", output.id, simulatedAppeal.id);
  TestValidator.equals("filer actor type", output.filer_actor_type, "customer");
  TestValidator.equals("filer actor id", output.filer_actor_id, customerId);
  TestValidator.predicate(
    "appeal has non-empty reason",
    output.reason.length > 0,
  );
  TestValidator.predicate(
    "appeal status exists",
    typeof output.status === "string" && output.status.length > 0,
  );
  TestValidator.predicate(
    "appeal created_at valid",
    typeof output.created_at === "string" && output.created_at.length > 0,
  );
  TestValidator.predicate(
    "appeal updated_at valid",
    typeof output.updated_at === "string" && output.updated_at.length > 0,
  );

  // Step 5: Try violating access: fetch another random appeal (simulate not found/forbidden)
  await TestValidator.error(
    "cannot access another customer's appeal detail",
    async () => {
      await api.functional.shopping.customer.appeals.at(connection, {
        appealId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
