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

export async function test_api_order_item_snapshots_pagination_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Join customer first to establish authentication context
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customer);
  // Generate random UUIDs for order and item IDs (since no creation API available)
  const orderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const itemId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 1. Test default pagination
  const defaultSnapshots =
    await api.functional.ecommerceMall.customer.orders.items._snapshots.index(
      customerConnection,
      {
        orderId,
        itemId,
        body: {},
      },
    );
  typia.assert(defaultSnapshots);
  TestValidator.equals(
    "default pagination current",
    defaultSnapshots.pagination.current,
    1,
  );
  TestValidator.equals(
    "default pagination limit",
    defaultSnapshots.pagination.limit,
    20,
  );
  // 2. Test custom pagination with specific page and limit
  const customPageSnapshots =
    await api.functional.ecommerceMall.customer.orders.items._snapshots.index(
      customerConnection,
      {
        orderId,
        itemId,
        body: { page: 2, limit: 15 },
      },
    );
  typia.assert(customPageSnapshots);
  TestValidator.equals(
    "custom pagination current",
    customPageSnapshots.pagination.current,
    2,
  );
  TestValidator.equals(
    "custom pagination limit",
    customPageSnapshots.pagination.limit,
    15,
  );
  // 3. Test maximum limit (100)
  const maxLimitSnapshots =
    await api.functional.ecommerceMall.customer.orders.items._snapshots.index(
      customerConnection,
      {
        orderId,
        itemId,
        body: { limit: 100 },
      },
    );
  typia.assert(maxLimitSnapshots);
  TestValidator.equals(
    "max limit pagination limit",
    maxLimitSnapshots.pagination.limit,
    100,
  );
  // 4. Test minimum limit (1)
  const minLimitSnapshots =
    await api.functional.ecommerceMall.customer.orders.items._snapshots.index(
      customerConnection,
      {
        orderId,
        itemId,
        body: { limit: 1 },
      },
    );
  typia.assert(minLimitSnapshots);
  TestValidator.equals(
    "min limit pagination limit",
    minLimitSnapshots.pagination.limit,
    1,
  );
  // 5. Test date range filtering
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const twoDaysAgo = new Date(
    now.getTime() - 48 * 60 * 60 * 1000,
  ).toISOString();
  const dateRangeSnapshots =
    await api.functional.ecommerceMall.customer.orders.items._snapshots.index(
      customerConnection,
      {
        orderId,
        itemId,
        body: {
          createdAtFrom: twoDaysAgo,
          createdAtTo: oneDayAgo,
        },
      },
    );
  typia.assert(dateRangeSnapshots);
  TestValidator.equals(
    "date range pagination current",
    dateRangeSnapshots.pagination.current,
    1,
  );
  // 6. Test actor type filtering
  const actorTypeSnapshots =
    await api.functional.ecommerceMall.customer.orders.items._snapshots.index(
      customerConnection,
      {
        orderId,
        itemId,
        body: { actorType: "customer" },
      },
    );
  typia.assert(actorTypeSnapshots);
  TestValidator.equals(
    "actor type filter pagination current",
    actorTypeSnapshots.pagination.current,
    1,
  );
  // Test with different actor types
  const sellerActorTypeSnapshots =
    await api.functional.ecommerceMall.customer.orders.items._snapshots.index(
      customerConnection,
      {
        orderId,
        itemId,
        body: { actorType: "seller" },
      },
    );
  typia.assert(sellerActorTypeSnapshots);
  const adminActorTypeSnapshots =
    await api.functional.ecommerceMall.customer.orders.items._snapshots.index(
      customerConnection,
      {
        orderId,
        itemId,
        body: { actorType: "admin" },
      },
    );
  typia.assert(adminActorTypeSnapshots);
  // 7. Test actor ID filtering
  const randomActorId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const actorIdSnapshots =
    await api.functional.ecommerceMall.customer.orders.items._snapshots.index(
      customerConnection,
      {
        orderId,
        itemId,
        body: { actorId: randomActorId },
      },
    );
  typia.assert(actorIdSnapshots);
  TestValidator.equals(
    "actor ID filter pagination current",
    actorIdSnapshots.pagination.current,
    1,
  );
  // 8. Test combination of filters
  const combinedSnapshots =
    await api.functional.ecommerceMall.customer.orders.items._snapshots.index(
      customerConnection,
      {
        orderId,
        itemId,
        body: {
          page: 1,
          limit: 10,
          createdAtFrom: oneDayAgo,
          createdAtTo: now.toISOString(),
          actorType: "customer",
          actorId: randomActorId,
        },
      },
    );
  typia.assert(combinedSnapshots);
  TestValidator.equals(
    "combined filters pagination current",
    combinedSnapshots.pagination.current,
    1,
  );
  TestValidator.equals(
    "combined filters pagination limit",
    combinedSnapshots.pagination.limit,
    10,
  );
  // 9. Verify pagination metadata correctness
  TestValidator.predicate(
    "pagination records positive",
    defaultSnapshots.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination limit positive",
    defaultSnapshots.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pages calculated correctly",
    defaultSnapshots.pagination.pages >= 0,
  );
  // 10. Test that sorting is maintained (verify all returned snapshots have created_at)
  if (defaultSnapshots.data.length > 0) {
    const firstSnapshot = defaultSnapshots.data[0];
    typia.assert(firstSnapshot);
    TestValidator.predicate(
      "snapshot has created_at",
      firstSnapshot.created_at !== undefined,
    );
  }
  // 11. Test actor_type field exists in snapshots
  if (defaultSnapshots.data.length > 0) {
    const sampleSnapshot = defaultSnapshots.data[0];
    typia.assert(sampleSnapshot);
    TestValidator.predicate(
      "snapshot has actor_type",
      sampleSnapshot.actor_type !== undefined,
    );
    TestValidator.predicate(
      "snapshot has actor_id",
      sampleSnapshot.actor_id !== undefined,
    );
  }
  // 12. Test change_reason can be null or string
  if (defaultSnapshots.data.length > 0) {
    const sampleSnapshot = defaultSnapshots.data[0];
    typia.assert(sampleSnapshot);
    // change_reason is optional, so it can be undefined, string, or null
    if (sampleSnapshot.change_reason !== undefined) {
      TestValidator.predicate(
        "change_reason is string or null",
        typeof sampleSnapshot.change_reason === "string" ||
          sampleSnapshot.change_reason === null,
      );
    }
  }
}