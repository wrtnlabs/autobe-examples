import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemVariantOption";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";

/**
 * Test that the force-refund operation enforces administrator-only authorization.
 *
 * Force-refund is a powerful administrative operation that bypasses normal refund
 * restrictions (no seller approval, no 7-day window). This test validates that
 * regular customers cannot access this administrative override function.
 *
 * **Business Context:**
 * - Force-refund allows admins to refund any order without normal restrictions
 * - This is a security-critical operation that must be admin-only
 * - Unauthorized access would allow arbitrary refunds, causing financial damage
 *
 * **Test Scenarios:**
 * 1. Customer attempts force-refund → 403 Forbidden
 *
 * **Expected Behavior:**
 * - Response returns 403 Forbidden
 * - Error indicates admin privileges required
 * - No changes made to any order
 */
export async function test_api_order_force_refund_authorization_required(
  connection: api.IConnection,
): Promise<void> {
  // Create a customer connection (non-admin user)
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(customerAuth);
  // Generate a valid UUID format for the order ID
  const orderId = typia.random<string & tags.Format<"uuid">>();
  // Prepare the force-refund request body
  const forceRefundBody = {
    reason: "Administrative test refund",
  } satisfies IShoppingMallOrder.IForceRefund;
  // Customer attempts to force-refund - should be forbidden
  await TestValidator.httpError(
    "customer cannot force-refund order",
    403,
    async () => {
      await api.functional.shoppingMall.admin.orders.force_refund.forceRefund(
        customerConnection,
        {
          orderId,
          body: forceRefundBody,
        },
      );
    },
  );
}
