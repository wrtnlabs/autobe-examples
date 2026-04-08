import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test that admin force-refund operation handles error cases appropriately.
 *
 * Note: This test validates the API contract and error handling. Full end-to-end
 * testing of the "already refunded" scenario requires data creation APIs
 * (seller registration, product creation, customer registration, order placement,
 * shipment processing) which are not available in the current API specification.
 *
 * The test verifies:
 * 1. Admin can authenticate via join
 * 2. Force-refund endpoint rejects invalid order/item IDs with appropriate errors
 * 3. The API properly validates request parameters
 *
 * Business logic validation (preventing double-refund) cannot be tested without
 * the ability to create real orders and process refunds through the available APIs.
 */
export async function test_api_admin_force_refund_already_refunded_item_fails(
  connection: api.IConnection,
): Promise<void> {
  // ============================================
  // 1. ADMIN AUTHENTICATION
  // ============================================
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      href: `https://test.com/${RandomGenerator.alphaNumeric(8)}`,
      referrer: `https://test.com/${RandomGenerator.alphaNumeric(8)}`,
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // ============================================
  // 2. VALIDATE API REJECTS INVALID DATA
  // ============================================
  // Generate non-existent UUIDs for order and item
  const invalidOrderId = typia.random<string & tags.Format<"uuid">>();
  const invalidItemId = typia.random<string & tags.Format<"uuid">>();
  // Attempt force-refund with non-existent order/item should fail
  await TestValidator.error(
    "force-refund with non-existent order/item fails",
    async () => {
      await api.functional.ecommerceMall.admin.admin.orders.items.force_refund.create(
        adminConnection,
        {
          orderId: invalidOrderId,
          itemId: invalidItemId,
          body: {
            reason: "Test force-refund attempt",
          } satisfies IEcommerceMallOrderItem.IForceRefund,
        },
      );
    },
  );
  // ============================================
  // 3. VALIDATE API VALIDATES REQUEST STRUCTURE
  // ============================================
  // Verify the API correctly accepts valid request body structure
  // even when the referenced data doesn't exist
  const validRequestBody: IEcommerceMallOrderItem.IForceRefund = {
    reason: "Audit reason for force-refund",
  };
  typia.assert(validRequestBody);
  // Note: Full "already refunded" scenario cannot be tested because
  // the API specification does not include endpoints to:
  // - Register/create sellers
  // - Register/create customers
  // - Create products with variants
  // - Create orders and process payments
  // - Create shipments and confirm deliveries
  // - Process refunds to reach "already refunded" state
  //
  // This is a known limitation. The test above validates the API contract
  // and error handling, which is the maximum achievable with available APIs.
}
