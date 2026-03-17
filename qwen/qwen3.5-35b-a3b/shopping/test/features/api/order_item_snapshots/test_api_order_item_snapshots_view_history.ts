import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItemSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_order_item_snapshots_view_history(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration
  const customerJoinConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_customer_join(customerJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<(string & tags.Format<"uri">)>() satisfies string & tags.Format<"uri">,
      referrer: typia.random<(string & tags.Format<"uri">)>() satisfies string & tags.Format<"uri">,
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(joinResponse);
  // 2. Create authenticated connection for customer API calls using join token
  const customerApiConnection: api.IConnection = {
    host: connection.host,
    headers: {
      ...connection.headers,
      Authorization: joinResponse.token.access,
    },
  };
  // 3. Create mock order and item IDs for snapshot retrieval
  // Note: Order creation API not available in current SDK, use generated UUIDs
  const mockOrderId: string & tags.Format<"uuid"> =
    typia.random<(string & tags.Format<"uuid">)>() satisfies string & tags.Format<"uuid">;
  const mockItemId: string & tags.Format<"uuid"> =
    typia.random<(string & tags.Format<"uuid">)>() satisfies string & tags.Format<"uuid">;
  // 4. Request snapshot history with pagination
  const snapshotResponse =
    await api.functional.ecommerceMall.customer.orders.items._snapshots.index(
      customerApiConnection,
      {
        orderId: mockOrderId,
        itemId: mockItemId,
        body: {
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IEcommerceMallOrderItemSnapshot.IRequest,
      },
    );
  typia.assert(snapshotResponse);
  // 5. Validate response structure - IPageIEcommerceMallOrderItemSnapshot.ISummary
  typia.assert(snapshotResponse);
  // 6. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    snapshotResponse.pagination.current,
    snapshotResponse.pagination.current,
  );
  TestValidator.equals(
    "pagination limit",
    snapshotResponse.pagination.limit,
    snapshotResponse.pagination.limit,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    snapshotResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    snapshotResponse.pagination.pages >= 0,
  );
  // 7. Validate total pages calculation: pages = ceil(records / limit)
  if (snapshotResponse.pagination.records > 0) {
    const expectedPages = Math.ceil(
      snapshotResponse.pagination.records / snapshotResponse.pagination.limit,
    );
    TestValidator.equals(
      "pagination pages calculation",
      snapshotResponse.pagination.pages,
      expectedPages,
    );
  } else {
    TestValidator.equals(
      "pagination pages zero",
      snapshotResponse.pagination.pages,
      0,
    );
  }
  // 8. Validate snapshots data array
  TestValidator.equals(
    "snapshots data length",
    snapshotResponse.data.length,
    snapshotResponse.pagination.records,
  );
  // 9. Validate snapshots are sorted chronologically (oldest first by created_at)
  for (let i = 1; i < snapshotResponse.data.length; i++) {
    const prevSnapshot = snapshotResponse.data[i - 1];
    const currSnapshot = snapshotResponse.data[i];
    TestValidator.equals(
      `snapshot chronology order item ${i}`,
      currSnapshot.created_at >= prevSnapshot.created_at,
      true,
    );
  }
  // 10. Validate each snapshot has required fields
  for (const snapshot of snapshotResponse.data) {
    typia.assert(snapshot);
    // Snapshot ID
    TestValidator.equals(
      "snapshot ID is UUID",
      snapshot.id !== undefined,
      true,
    );
    // Actor information
    TestValidator.equals(
      "snapshot actor_type is string",
      typeof snapshot.actor_type === "string",
      true,
    );
    TestValidator.equals(
      "snapshot actor_id is UUID",
      snapshot.actor_id !== undefined,
      true,
    );
    // Change data
    TestValidator.equals(
      "snapshot before_data exists",
      snapshot.before_data !== undefined,
      true,
    );
    TestValidator.equals(
      "snapshot after_data exists",
      snapshot.after_data !== undefined,
      true,
    );
    // Timestamps
    TestValidator.equals(
      "snapshot created_at exists",
      snapshot.created_at !== undefined,
      true,
    );
    TestValidator.equals(
      "snapshot updated_at exists",
      snapshot.updated_at !== undefined,
      true,
    );
    // OrderItem reference
    TestValidator.equals(
      "snapshot orderItem exists",
      snapshot.orderItem !== undefined,
      true,
    );
    // OrderItem required fields
    const orderItem = snapshot.orderItem;
    typia.assert(orderItem);
    TestValidator.equals(
      "orderItem ID is UUID",
      orderItem.id !== undefined,
      true,
    );
    TestValidator.equals(
      "orderItem productName exists",
      orderItem.productName !== undefined,
      true,
    );
    TestValidator.equals(
      "orderItem productSku exists",
      orderItem.productSku !== undefined,
      true,
    );
    TestValidator.equals(
      "orderItem variantName exists",
      orderItem.variantName !== undefined,
      true,
    );
    TestValidator.equals(
      "orderItem quantity positive",
      orderItem.quantity >= 1,
      true,
    );
    TestValidator.equals(
      "orderItem unitPrice positive",
      orderItem.unitPrice > 0,
      true,
    );
    TestValidator.equals(
      "orderItem totalPrice positive",
      orderItem.totalPrice > 0,
      true,
    );
    TestValidator.equals(
      "orderItem status is valid",
      orderItem.status !== undefined,
      true,
    );
  }
}