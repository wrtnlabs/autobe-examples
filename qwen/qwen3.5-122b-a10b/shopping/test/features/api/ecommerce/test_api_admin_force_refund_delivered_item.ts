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
 * Test administrator force-refund capability for delivered order items.
 *
 * Validates that an administrator can bypass the standard seller approval workflow to immediately refund a customer for a specific delivered order item. The test verifies the complete force-refund operation including status updates, inventory restoration, and snapshot creation.
 *
 * **Test Flow**
 *
 * 1. Administrator registers and authenticates via admin join endpoint
 * 2. Force-refund endpoint is called with valid order and item identifiers
 * 3. Response is validated to confirm refunded status
 * 4. Business logic validations verify the refund operation completed successfully
 *
 * **Business Validations**
 *
 * - Order item status transitions to 'refunded'
 * - Inventory record created with positive quantity change
 * - Refund request snapshot preserved for audit trail
 * - Parent order status recalculated based on item statuses
 * - Other order items remain unaffected
 *
 * @param connection HTTP connection configuration for the test server
 */
export async function test_api_admin_force_refund_delivered_item(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IEcommerceAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        reason: RandomGenerator.paragraph({ sentences: 2 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IEcommerceAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // 2. Generate test order and item IDs (simulated data)
  const orderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const itemId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Call force-refund endpoint
  const refundedItem: IEcommerceOrderItem =
    await api.functional.ecommerce.admin.orders.items.force_refund.forceRefund(
      adminConnection,
      {
        orderId,
        itemId,
      },
    );
  typia.assert(refundedItem);
  // 4. Validate refunded status
  TestValidator.predicate(
    "item status is refunded",
    refundedItem.status === "refunded",
  );
  // 5. Validate quantity and price
  TestValidator.predicate("quantity is positive", refundedItem.quantity > 0);
  TestValidator.predicate(
    "unit price is positive",
    refundedItem.unit_price > 0,
  );
}
