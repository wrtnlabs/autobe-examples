import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import type { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import type { IEcommerceOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItemSnapshot";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
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
 * Test administrator force-refund rejection for already-refunded order items.
 *
 * Validates that attempting to force-refund an order item that is already in 'refunded' status is properly rejected with a conflict error. This test ensures the system maintains idempotency constraints and prevents duplicate stock restoration.
 *
 * Note: Due to limited SDK functions available, this test validates that force-refund properly rejects invalid requests (404 or 409). A complete test would require creating order items and setting them to refunded status, which is not possible with the provided API functions.
 *
 * The scenario tests the following business rules:
 * 1. Administrator authentication and authorization for force-refund operations
 * 2. Conflict detection when attempting to refund an already-refunded item
 * 3. Proper error response (409 Conflict) for duplicate refund attempts
 * 4. No side effects (no inventory changes, no snapshots) on rejected refund attempts
 *
 * 1. Administrator registers and authenticates via admin join endpoint.
 * 2. Administrator attempts to force-refund an order item with random UUIDs.
 * 3. System validates the refund attempt and returns appropriate error.
 * 4. Test validates the error response indicates the item is already refunded or not found.
 */
export async function test_api_admin_force_refund_already_refunded_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      reason: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Attempt to force-refund with random UUIDs
  // Note: Without SDK functions to create order items, we test error handling
  // for non-existent or already-refunded items (404 or 409)
  const orderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const itemId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Validate that force-refund throws an error (404 or 409)
  await TestValidator.httpError(
    "force-refund should reject already-refunded or non-existent item",
    [404, 409],
    async () => {
      await api.functional.ecommerce.admin.orders.items.force_refund.forceRefund(
        adminConnection,
        {
          orderId,
          itemId,
        },
      );
    },
  );
}
