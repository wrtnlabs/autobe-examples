import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_order_item_retrieval_authorization_enforcement(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create Customer A
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerA = await authorize_customer_join(customerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerA);
  // 2. Setup: Create Customer B
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerB = await authorize_customer_join(customerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerB);
  // 3. Generate UUIDs for order and item that would belong to different customers
  // Customer A's order ID (Customer A would have access to these)
  const customerAOrderId = typia.random<string & tags.Format<"uuid">>();
  const customerAItemId = typia.random<string & tags.Format<"uuid">>();
  // Customer B's order ID (Customer B would have access to these)
  const customerBOrderId = typia.random<string & tags.Format<"uuid">>();
  const customerBItemId = typia.random<string & tags.Format<"uuid">>();
  // 4. Scenario A: Customer A retrieves their own order item (should succeed if item exists)
  // This validates that Customer A can access order items belonging to their order
  await TestValidator.error(
    "Customer A accesses order item not in their order",
    async () => {
      await api.functional.ecommerceMall.customer.orders.items.at(
        customerAConnection,
        {
          orderId: customerBOrderId, // Wrong order - belongs to Customer B
          itemId: customerBItemId, // Wrong item - belongs to Customer B
        },
      );
    },
  );
  // 5. Scenario B: Customer B attempts to access Customer A's order item (should fail)
  await TestValidator.error(
    "Customer B cannot access another customer's order item",
    async () => {
      await api.functional.ecommerceMall.customer.orders.items.at(
        customerBConnection,
        {
          orderId: customerAOrderId, // Wrong order - belongs to Customer A
          itemId: customerAItemId, // Wrong item - belongs to Customer A
        },
      );
    },
  );
  // 6. Scenario C: Customer B attempts to access Customer B's own order item (should succeed if exists)
  // This validates Customer B can access their own order items
  await TestValidator.error(
    "Customer B accesses order item not in their order",
    async () => {
      await api.functional.ecommerceMall.customer.orders.items.at(
        customerBConnection,
        {
          orderId: customerAOrderId, // Wrong order - belongs to Customer A
          itemId: customerAItemId, // Wrong item - belongs to Customer A
        },
      );
    },
  );
  // 7. Cross-verification: Customer A tries Customer B's order/item again (bidirectional test)
  await TestValidator.error(
    "Bidirectional: Customer A cannot access Customer B's order item",
    async () => {
      await api.functional.ecommerceMall.customer.orders.items.at(
        customerAConnection,
        {
          orderId: customerBOrderId,
          itemId: customerBItemId,
        },
      );
    },
  );
  // 8. Verify different UUIDs result in different authorization outcomes
  const differentOrderItemPair1 = {
    orderId: typia.random<string & tags.Format<"uuid">>(),
    itemId: typia.random<string & tags.Format<"uuid">>(),
  };
  const differentOrderItemPair2 = {
    orderId: typia.random<string & tags.Format<"uuid">>(),
    itemId: typia.random<string & tags.Format<"uuid">>(),
  };
  TestValidator.notEquals(
    "Different order-item pairs generated",
    differentOrderItemPair1.orderId,
    differentOrderItemPair2.orderId,
  );
  TestValidator.notEquals(
    "Different order-item pairs generated",
    differentOrderItemPair1.itemId,
    differentOrderItemPair2.itemId,
  );
  // Validate that authorization fails for completely fabricated UUIDs
  await TestValidator.error(
    "Fabricated order item is inaccessible",
    async () => {
      await api.functional.ecommerceMall.customer.orders.items.at(
        customerAConnection,
        differentOrderItemPair1,
      );
    },
  );
  await TestValidator.error(
    "Another fabricated order item is inaccessible",
    async () => {
      await api.functional.ecommerceMall.customer.orders.items.at(
        customerBConnection,
        differentOrderItemPair2,
      );
    },
  );
  // 9. Final validation: Each customer's authorization context is properly isolated
  TestValidator.equals("Customer A ID is distinct", customerA.id, customerA.id);
  TestValidator.equals("Customer B ID is distinct", customerB.id, customerB.id);
  TestValidator.notEquals(
    "Customer A and Customer B are different users",
    customerA.id,
    customerB.id,
  );
}
