import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCustomerAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddressSnapshot";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderShippingAddress";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
import type { IShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingMethod";

/**
 * Validate admin shipment detail not-found behavior for unknown shipmentCode.
 *
 * Business purpose: Ensure that when an authenticated admin requests shipment
 * detail using a syntactically valid but non-existent shipmentCode, the
 * platform responds with an error (not-found style) and does not accidentally
 * return any IShoppingMallShipment data.
 *
 * This protects against data leakage and ensures predictable error semantics
 * for monitoring and clients.
 *
 * Test steps:
 *
 * 1. Register a new admin via POST /auth/admin/join to obtain an authenticated
 *    admin context (Authorization header will be set by SDK).
 * 2. Generate a random shipmentCode string that is extremely unlikely to exist
 *    (e.g., high-entropy alphanumeric) to represent an unknown shipmentCode.
 * 3. Call GET /shoppingMall/admin/shipments/{shipmentCode} with this random code
 *    using api.functional.shoppingMall.admin.shipments.at.
 * 4. Assert that the call fails with an error using TestValidator.error, proving
 *    that non-existent shipment codes are not treated as success.
 * 5. (Optional) Call the same endpoint again with the same code to confirm
 *    consistent behavior.
 *
 * Notes:
 *
 * - We must not test HTTP status code numerically, only that an error is thrown.
 * - We must not inspect the internal error body; TestValidator.error is enough to
 *   ensure error behavior.
 * - The shipmentCode parameter type is string; we provide a normal string, not a
 *   malformed type.
 */
export async function test_api_admin_shipment_detail_not_found_for_unknown_code(
  connection: api.IConnection,
) {
  // 1. Register and authenticate an admin via join
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.test.local/join",
    referrer: "https://admin.test.local/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Generate a syntactically valid but non-existent shipmentCode
  const unknownShipmentCode: string = RandomGenerator.alphaNumeric(32);

  // 3-4. Call shipment detail endpoint with the unknown code and expect error
  await TestValidator.error(
    "unknown shipmentCode must cause error",
    async () => {
      await api.functional.shoppingMall.admin.shipments.at(connection, {
        shipmentCode: unknownShipmentCode,
      });
    },
  );

  // 5. Optional: repeat call with the same code to ensure consistent behavior
  await TestValidator.error(
    "repeated unknown shipmentCode must consistently cause error",
    async () => {
      await api.functional.shoppingMall.admin.shipments.at(connection, {
        shipmentCode: unknownShipmentCode,
      });
    },
  );
}
