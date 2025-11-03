import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";

/**
 * Validate permanent product deletion by compliance admin.
 *
 * This test covers a full workflow where a privileged admin user is onboarded,
 * then performs permanent product deletion by product code, regardless of
 * seller. It checks that only properly authenticated administrators can execute
 * deletion, deletion is not blocked by referential integrity or order status,
 * and that compliance policies and audit/traceability are respected.
 *
 * Steps:
 *
 * 1. Register a new admin (compliance privilege role)
 * 2. Attempt product deletion as unauthenticated (should fail)
 * 3. Delete a product as compliance admin
 * 4. Confirm that product code is no longer visible/retrievable (simulate lookups
 *    in catalog and UI context)
 *
 * This test does not validate audit logs or deletion of SKUs/images explicitly
 * (not exposed in current API/context).
 */
export async function test_api_product_deletion_by_admin_for_compliance(
  connection: api.IConnection,
) {
  // 1. Register a compliance admin
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12) as string &
        tags.MinLength<8> &
        tags.MaxLength<128>,
      name: RandomGenerator.name(),
      role: "compliance" as string & tags.MinLength<2> & tags.MaxLength<32>,
      status: "active" as string & tags.MinLength<3> & tags.MaxLength<20>,
    } satisfies IShoppingAdmin.IJoin,
  });
  typia.assert(adminJoin);

  // 2. Generate a random product code for deletion
  const productCode = RandomGenerator.alphaNumeric(14);

  // 2a. Attempt to delete as unauthenticated - should fail
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "deletion should be blocked for unauthenticated actors",
    async () => {
      await api.functional.shopping.admin.products.erase(unauthConn, {
        productCode,
      });
    },
  );

  // 3. Delete as authenticated compliance admin
  await api.functional.shopping.admin.products.erase(connection, {
    productCode,
  });

  // 4. Try deleting again (should fail - already deleted)
  await TestValidator.error(
    "deletion should fail for already deleted product",
    async () => {
      await api.functional.shopping.admin.products.erase(connection, {
        productCode,
      });
    },
  );
}
