import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallOrderCustomerContact } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderCustomerContact";

/**
 * Validate that admin customer contact snapshot creation requires an existing
 * order.
 *
 * Business goal
 *
 * - Ensure that POST /shoppingMall/admin/orders/{orderCode} refuses to create a
 *   customer contact snapshot when the provided orderCode does not correspond
 *   to any persisted order.
 * - Confirm that the operation behaves consistently for different non-existent
 *   order codes and that callers can rely on an error instead of silent
 *   snapshot creation.
 *
 * Scenario steps
 *
 * 1. Register a new admin using POST /auth/admin/join and obtain an
 *    IShoppingMallAdmin.IAuthorized context. The SDK will automatically wire
 *    the JWT into connection.headers.Authorization; the test must never touch
 *    headers directly.
 * 2. Generate a syntactically valid IShoppingMallOrderCustomerContact.ICreate body
 *    for the snapshot request. This body represents contact_name,
 *    contact_email, and optional contact_phone.
 * 3. Generate a clearly non-existent order code (orderCode1) using
 *    typia.random<string>(). Because we do not create any orders in this test,
 *    the probability that this code matches an existing order is effectively
 *    zero.
 * 4. Call api.functional.shoppingMall.admin.orders.create with orderCode1 and the
 *    valid contact body inside TestValidator.error, asserting that an error is
 *    thrown (e.g., not-found/404 semantics) instead of a successful snapshot
 *    creation.
 * 5. Repeat step 4 with a second random non-existent orderCode (orderCode2) to
 *    ensure that the behavior is stable and not dependent on a particular
 *    value.
 *
 * NOTE: The natural-language scenario mentions asserting a 404 code and
 * verifying that no row is created. However, the E2E rules prohibit explicit
 * status-code checks, and we have no read/list endpoint for contact snapshots.
 * Therefore, this test validates only that the operation fails (via
 * TestValidator.error) when the orderCode is missing, which is the closest
 * implementable behavior to "not-found and no orphan rows" given the available
 * APIs.
 */
export async function test_api_admin_order_contact_snapshot_requires_existing_order(
  connection: api.IConnection,
) {
  // 1. Register an admin and obtain authorized context
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Prepare a valid customer contact snapshot body
  const contactCreateBody = {
    contact_name: RandomGenerator.name(2),
    contact_email: typia.random<string & tags.Format<"email">>(),
    contact_phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallOrderCustomerContact.ICreate;

  // 3. First non-existent order code attempt
  const orderCode1: string = typia.random<string>();

  await TestValidator.error(
    "creating customer contact snapshot for a non-existent orderCode must fail (first attempt)",
    async () => {
      await api.functional.shoppingMall.admin.orders.create(connection, {
        orderCode: orderCode1,
        body: contactCreateBody,
      });
    },
  );

  // 4. Second non-existent order code attempt to confirm consistent behavior
  const orderCode2: string = typia.random<string>();

  await TestValidator.error(
    "creating customer contact snapshot for a different non-existent orderCode must also fail (second attempt)",
    async () => {
      await api.functional.shoppingMall.admin.orders.create(connection, {
        orderCode: orderCode2,
        body: contactCreateBody,
      });
    },
  );
}
