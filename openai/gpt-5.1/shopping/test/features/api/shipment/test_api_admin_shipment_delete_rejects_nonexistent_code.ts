import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";

/**
 * Ensure admin shipment deletion rejects non-existent shipment codes.
 *
 * Business goal:
 *
 * - Verify that the admin DELETE /shoppingMall/admin/shipments/{shipmentCode}
 *   endpoint does not succeed when asked to delete a shipment that does not
 *   exist, and that it fails in a controlled way instead of accidentally
 *   creating or mutating data.
 *
 * Constraints and available APIs:
 *
 * - We only have two concrete SDK APIs in scope:
 *
 *   - Api.functional.auth.admin.join (POST /auth/admin/join)
 *   - Api.functional.shoppingMall.admin.shipments.erase (DELETE
 *       /shoppingMall/admin/shipments/{shipmentCode})
 * - There is no shipment creation or listing API imported into this test, so we
 *   cannot assert on shipment collections or order states as part of this
 *   test.
 * - We also must not test specific HTTP status codes (like 404) directly, and we
 *   must not introspect HttpError.status. The only allowed negative assertion
 *   is that an error is thrown at all.
 * - We must not manipulate `connection.headers` directly; join will establish
 *   admin auth by itself.
 *
 * Scenario implemented here:
 *
 * 1. Register a new admin using POST /auth/admin/join to obtain an authenticated
 *    admin context. This also configures the connection Authorization header
 *    automatically via the SDK.
 * 2. Generate a synthetically unique shipmentCode string that is extremely
 *    unlikely to correspond to any real shipment (e.g., a prefixed random
 *    token).
 * 3. Invoke DELETE /shoppingMall/admin/shipments/{shipmentCode} with that
 *    non-existent shipment code.
 * 4. Assert, via TestValidator.error, that calling erase with this code throws an
 *    error. We do not inspect status codes or error payloads; we only confirm
 *    that the delete does not succeed silently.
 * 5. Because we do not have any read/list API for shipments or related orders
 *    within this test module, we cannot directly assert that other shipments or
 *    orders remain unchanged. We accept that limitation and instead focus on
 *    the negative behavior of erase itself in the face of a non-existent code.
 */
export async function test_api_admin_shipment_delete_rejects_nonexistent_code(
  connection: api.IConnection,
) {
  // 1. Register a new admin and establish authenticated context.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null as
      | (string & tags.Format<"ipv4">)
      | (string & tags.Format<"ipv6">)
      | null
      | undefined,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(authorizedAdmin);

  // 2. Generate a clearly artificial shipment code that should not exist.
  const randomToken = RandomGenerator.alphaNumeric(32);
  const nonExistentShipmentCode = `NON_EXISTENT_${randomToken}`;

  // 3 & 4. Attempt deletion and assert that an error is thrown.
  await TestValidator.error(
    "erase should fail for non-existent shipment code",
    async () => {
      await api.functional.shoppingMall.admin.shipments.erase(connection, {
        shipmentCode: nonExistentShipmentCode,
      });
    },
  );
}
