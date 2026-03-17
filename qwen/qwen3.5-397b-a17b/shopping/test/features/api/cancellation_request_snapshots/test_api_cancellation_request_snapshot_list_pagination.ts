import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequestSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_cancellation_requests_create } from "../../../generate/generate_random_shopping_mall_customer_cancellation_requests_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";

export async function test_api_cancellation_request_snapshot_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and login
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoin = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test1234",
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerJoin);
  // 2. Create an order with items in paid status
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {},
  );
  typia.assert(order);
  // Verify order has items with PAID status
  TestValidator.predicate("order has items", order.items.length > 0);
  const orderItem = order.items[0];
  TestValidator.equals("order item status is PAID", orderItem.status, "PAID");
  // 3. Submit a cancellation request for the order item
  const cancellationRequest =
    await generate_random_shopping_mall_customer_cancellation_requests_create(
      customerConnection,
      {
        body: {
          order_item_id: orderItem.id,
          reason: "Customer changed mind about this item",
        } satisfies IShoppingMallCancellationRequest.ICreate,
      },
    );
  typia.assert(cancellationRequest);
  TestValidator.equals(
    "cancellation request status is PENDING",
    cancellationRequest.status,
    "PENDING",
  );
  // 4. Seller registration and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoin = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test1234",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerJoin);
  // 5. Seller approves the cancellation request (creates snapshot)
  const updatedCancellationRequest =
    await api.functional.shoppingMall.seller.cancellation_requests.update(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          status: "APPROVED",
          responded_at: new Date().toISOString(),
        } satisfies IShoppingMallCancellationRequest.IUpdate,
      },
    );
  typia.assert(updatedCancellationRequest);
  TestValidator.equals(
    "cancellation request status is APPROVED",
    updatedCancellationRequest.status,
    "APPROVED",
  );
  // 6. Customer retrieves cancellation request snapshots
  const snapshotsResponse =
    await api.functional.shoppingMall.customer.cancellation_request_snapshots.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsResponse);
  // 7. Verify snapshot data
  TestValidator.predicate(
    "snapshots response has data",
    snapshotsResponse.data.length > 0,
  );
  const snapshot = snapshotsResponse.data[0];
  TestValidator.equals(
    "snapshot cancellation request ID matches",
    snapshot.cancellation_request_id,
    cancellationRequest.id,
  );
  TestValidator.equals(
    "snapshot reason matches",
    snapshot.reason,
    "Customer changed mind about this item",
  );
  TestValidator.equals(
    "snapshot status is APPROVED",
    snapshot.status,
    "APPROVED",
  );
  TestValidator.predicate(
    "snapshot has requested_at timestamp",
    snapshot.requested_at !== null && snapshot.requested_at !== undefined,
  );
  TestValidator.predicate(
    "snapshot has responded_at timestamp",
    snapshot.responded_at !== null && snapshot.responded_at !== undefined,
  );
  TestValidator.predicate(
    "snapshot has responded_by_seller",
    snapshot.responded_by_seller !== null &&
      snapshot.responded_by_seller !== undefined,
  );
  // 8. Create additional cancellation requests for pagination testing
  const order2 = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {},
  );
  typia.assert(order2);
  const orderItem2 = order2.items[0];
  const cancellationRequest2 =
    await generate_random_shopping_mall_customer_cancellation_requests_create(
      customerConnection,
      {
        body: {
          order_item_id: orderItem2.id,
          reason: "Second cancellation request for pagination test",
        } satisfies IShoppingMallCancellationRequest.ICreate,
      },
    );
  typia.assert(cancellationRequest2);
  // Seller approves second cancellation request
  await api.functional.shoppingMall.seller.cancellation_requests.update(
    sellerConnection,
    {
      cancellationRequestId: cancellationRequest2.id,
      body: {
        status: "APPROVED",
        responded_at: new Date().toISOString(),
      } satisfies IShoppingMallCancellationRequest.IUpdate,
    },
  );
  // 9. Test pagination - retrieve first page
  const page1Response =
    await api.functional.shoppingMall.customer.cancellation_request_snapshots.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies IShoppingMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(page1Response);
  // Verify pagination metadata
  TestValidator.equals(
    "page 1 current page",
    page1Response.pagination.current,
    1,
  );
  TestValidator.equals("page 1 limit", page1Response.pagination.limit, 1);
  TestValidator.predicate(
    "page 1 has at least 2 total records",
    page1Response.pagination.records >= 2,
  );
  TestValidator.predicate(
    "page 1 has at least 2 total pages",
    page1Response.pagination.pages >= 2,
  );
  TestValidator.equals("page 1 has 1 item", page1Response.data.length, 1);
  // 10. Test pagination - retrieve second page
  const page2Response =
    await api.functional.shoppingMall.customer.cancellation_request_snapshots.index(
      customerConnection,
      {
        body: {
          page: 2,
          limit: 1,
        } satisfies IShoppingMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(page2Response);
  TestValidator.equals(
    "page 2 current page",
    page2Response.pagination.current,
    2,
  );
  TestValidator.equals("page 2 limit", page2Response.pagination.limit, 1);
  TestValidator.equals("page 2 has 1 item", page2Response.data.length, 1);
  // 11. Verify snapshots are in chronological order (newest first)
  const firstSnapshotDate = new Date(
    page1Response.data[0].created_at,
  ).getTime();
  const secondSnapshotDate = new Date(
    page2Response.data[0].created_at,
  ).getTime();
  TestValidator.predicate(
    "snapshots ordered newest first",
    firstSnapshotDate >= secondSnapshotDate,
  );
  // 12. Verify different snapshots have different cancellation request IDs
  TestValidator.notEquals(
    "different cancellation requests",
    page1Response.data[0].cancellation_request_id,
    page2Response.data[0].cancellation_request_id,
  );
}
