import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingOrderSplit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrderSplit";
import type { IShoppingOrderStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrderStatusHistory";
import type { IShoppingSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSeller";

/**
 * Validates admin privilege for updating order split status.
 *
 * 1. Registers a platform admin with a random business email and privileged role.
 * 2. Creates a random order split codes and prepares a random status value.
 * 3. As authenticated admin, updates the status of an arbitrary split using the
 *    API.
 * 4. Ensures status field is updated and persisted.
 * 5. Attempts the same update with insufficient privileges (unauthenticated
 *    connection) and ensures it fails.
 */
export async function test_api_admin_order_split_status_update(
  connection: api.IConnection,
) {
  // 1. Register & authenticate platform admin
  const adminReq = {
    email: RandomGenerator.name(1) + Date.now() + "@business.com",
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(2),
    role: "super",
    status: "active",
  } satisfies IShoppingAdmin.IJoin;
  const admin = await api.functional.auth.admin.join(connection, {
    body: adminReq,
  });
  typia.assert(admin);

  // 2. Generate test values for orderCode/splitCode and a new random status
  const orderCode = RandomGenerator.alphaNumeric(14);
  const splitCode = RandomGenerator.alphaNumeric(8);
  const initialStatus = "pending";
  const newStatus = RandomGenerator.pick([
    "fulfilled",
    "in_transit",
    "cancelled",
  ] as const);

  // 3. As admin, update the split status
  const updateBody = {
    status: newStatus,
  } satisfies IShoppingOrderSplit.IUpdate;
  const updated = await api.functional.shopping.admin.orders.splits.update(
    connection,
    {
      orderCode,
      splitCode,
      body: updateBody,
    },
  );
  typia.assert(updated);
  TestValidator.equals(
    "updated split status is persisted",
    updated.status,
    newStatus,
  );

  // 4. Attempt same update with unauthenticated connection (should fail)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "non-admin cannot update split status",
    async () => {
      await api.functional.shopping.admin.orders.splits.update(unauthConn, {
        orderCode,
        splitCode,
        body: {
          status: RandomGenerator.pick(["fulfilled", "cancelled"] as const),
        } satisfies IShoppingOrderSplit.IUpdate,
      });
    },
  );
}
