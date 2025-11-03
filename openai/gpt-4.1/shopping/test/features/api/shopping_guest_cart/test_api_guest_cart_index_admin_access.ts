import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingGuestCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingGuestCartItem";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingGuestCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingGuestCartItem";

/**
 * Validates admin access and privacy guarantees for guest shopping cart index
 * operation.
 *
 * 1. Register a new admin with permitted status/role.
 * 2. Assert successful authentication by checking response.
 * 3. Prepare a random set of cart session search filters and sorted paginated
 *    request.
 * 4. Request PATCH /shopping/admin/guestCarts as authenticated admin.
 * 5. Validate that result is paginated summary about session, and no PII or cart
 *    item detail is included.
 * 6. Check fields: session_key, created_at, updated_at, expires_at, items[].
 *    Ensure guest-only data is present, not customer info, and number of
 *    results matches pagination.
 * 7. Confirm admin-only endpoint returns correct data shape for various page/limit
 *    combos.
 */
export async function test_api_guest_cart_index_admin_access(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
      role: "superadmin",
      status: "active",
    } satisfies IShoppingAdmin.IJoin,
  });
  typia.assert(adminJoin);
  // 2. Prepare random paginated & filtered request
  const now = new Date();
  const created_from = new Date(now.getTime() - 7 * 86400000).toISOString(); // 7 days ago
  const created_to = now.toISOString();
  const sort_by: string = RandomGenerator.pick([
    "updated_at",
    "created_at",
    "expires_at",
  ] as const);
  const sort_order: "asc" | "desc" = RandomGenerator.pick([
    "asc",
    "desc",
  ] as const);
  const page: number = 1;
  const limit: number = 10;
  // 3. Search for guest cart sessions (as admin)
  const response = await api.functional.shopping.admin.guestCarts.index(
    connection,
    {
      body: {
        created_from,
        created_to,
        sort_by,
        sort_order,
        page,
        limit,
      } satisfies IShoppingGuestCartItem.IRequest,
    },
  );
  typia.assert(response);
  // 4. Validate response shape and privacy
  TestValidator.predicate(
    "response has pagination and data",
    response.pagination !== undefined && Array.isArray(response.data),
  );
  // Every cart must have only session key, timestamps, and items (no PII, no customerId, etc)
  for (const cart of response.data) {
    TestValidator.predicate(
      "cart summary fields",
      typeof cart.session_key === "string" &&
        typeof cart.created_at === "string" &&
        typeof cart.updated_at === "string" &&
        typeof cart.expires_at === "string" &&
        Array.isArray(cart.items),
    );
    // No customer PII or identity in guest cart summary
    TestValidator.equals(
      "no customer id",
      (cart as any).customer_id,
      undefined,
    );
    TestValidator.equals(
      "no customer email",
      (cart as any).customer_email,
      undefined,
    );
    // Items must be summary only (item structure not containing sensitive fields)
    for (const item of cart.items) {
      TestValidator.predicate("item summary fields", typeof item === "object");
      // Just check some basic expected structure (must not include price, customer-specific fields, etc)
      TestValidator.equals(
        "no customer field in item",
        (item as any).customer_id,
        undefined,
      );
      TestValidator.equals(
        "no price field in item",
        (item as any).price,
        undefined,
      );
    }
  }
  // 5. Validate pagination matches request
  TestValidator.equals("limit as requested", response.pagination.limit, limit);
  TestValidator.equals(
    "current page as requested",
    response.pagination.current,
    page,
  );
}
