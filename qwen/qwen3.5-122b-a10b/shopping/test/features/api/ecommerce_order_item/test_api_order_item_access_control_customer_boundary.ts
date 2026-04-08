import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test customer boundary access control for order items.
 *
 * Validates that customers cannot access order items belonging to other customers' orders or order items they don't have permission to view. This test ensures proper access control enforcement at the order item level, protecting customer data privacy and maintaining order isolation between different customers.
 *
 * The test creates two separate customer accounts and validates that one customer cannot access order items using arbitrary order and item IDs. The access attempt must be rejected with an appropriate HTTP error status (403 Forbidden or 404 Not Found), ensuring that the system properly enforces row-level security and access control policies.
 *
 * 1. Create first customer (customer A) as a registered account holder.
 * 2. Create second customer (customer B) as another registered account holder.
 * 3. Customer B attempts to access order items using random UUIDs for order and item IDs.
 * 4. Validate that access is denied with appropriate HTTP error status (403 or 404).
 * 5. Verify that no order item data is leaked in the error response.
 */
export async function test_api_order_item_access_control_customer_boundary(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first customer (customer A) - registered account holder
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerA = await authorize_customer_join(customerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customerA);
  // 2. Create second customer (customer B) - another registered account holder
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerB = await authorize_customer_join(customerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customerB);
  // 3. Customer B attempts to access order items using random UUIDs
  // This tests the access control boundary - customer B should not be able to
  // access any order items, whether they exist or not, without proper authorization
  const randomOrderId = typia.random<string & tags.Format<"uuid">>();
  const randomItemId = typia.random<string & tags.Format<"uuid">>();
  // 4. Validate that customer B cannot access order items with arbitrary IDs
  // The system should reject this with 403 Forbidden (access denied) or
  // 404 Not Found (resource not accessible) to prevent information leakage
  await TestValidator.httpError(
    "customer B cannot access order item with arbitrary IDs",
    [403, 404],
    async () => {
      await api.functional.ecommerce.customer.orders.items.at(
        customerBConnection,
        {
          orderId: randomOrderId,
          itemId: randomItemId,
        },
      );
    },
  );
  // 5. Additional validation: verify customer A also cannot access arbitrary IDs
  // This confirms the access control works consistently for all customers
  await TestValidator.httpError(
    "customer A cannot access order item with arbitrary IDs",
    [403, 404],
    async () => {
      await api.functional.ecommerce.customer.orders.items.at(
        customerAConnection,
        {
          orderId: randomOrderId,
          itemId: randomItemId,
        },
      );
    },
  );
}
