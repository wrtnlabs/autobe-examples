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

export async function test_api_cancellation_request_snapshot_chronological_history(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoin = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerJoin);
  // 2. Seller registration and authentication (for responding to cancellation)
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoin = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SellerPassword123!",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerJoin);
  // 3. Create an order with items (using generation function)
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {},
  );
  typia.assert(order);
  // Verify order has at least one item
  TestValidator.predicate("order has items", order.items.length > 0);
  const orderItem = order.items[0];
  TestValidator.equals("order item status is PAID", orderItem.status, "PAID");
  // 4. Submit cancellation request for the order item
  const cancellationRequest =
    await generate_random_shopping_mall_customer_cancellation_requests_create(
      customerConnection,
      {
        body: {
          order_item_id: orderItem.id,
          reason: "Customer requested cancellation for testing purposes",
        } satisfies IShoppingMallCancellationRequest.ICreate,
      },
    );
  typia.assert(cancellationRequest);
  // Verify cancellation request details
  TestValidator.equals(
    "cancellation request order item matches",
    cancellationRequest.orderItem.id,
    orderItem.id,
  );
  TestValidator.equals(
    "cancellation request status is PENDING",
    cancellationRequest.status,
    "PENDING",
  );
  TestValidator.equals(
    "cancellation request reason preserved",
    cancellationRequest.reason,
    "Customer requested cancellation for testing purposes",
  );
  // 5. Seller responds to cancellation request (APPROVED) - creates first snapshot
  const updateResponse =
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
  typia.assert(updateResponse);
  // Verify the cancellation request was updated
  TestValidator.equals(
    "cancellation request status updated to APPROVED",
    updateResponse.status,
    "APPROVED",
  );
  TestValidator.predicate(
    "responded_at timestamp is set",
    updateResponse.responded_at !== null,
  );
  // 6. Customer retrieves snapshot history with cancellationRequestId filter
  const snapshotsPage =
    await api.functional.shoppingMall.customer.cancellation_request_snapshots.index(
      customerConnection,
      {
        body: {
          cancellationRequestId: cancellationRequest.id,
          sort: "created_at,asc",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsPage);
  // Verify pagination structure
  TestValidator.predicate(
    "pagination has current page",
    snapshotsPage.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has limit",
    snapshotsPage.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has records count",
    snapshotsPage.pagination.records >= 0,
  );
  // Verify at least one snapshot exists
  TestValidator.predicate(
    "at least one snapshot created",
    snapshotsPage.data.length >= 1,
  );
  // 7. Verify snapshot data integrity
  const snapshot = snapshotsPage.data[0];
  TestValidator.equals(
    "snapshot cancellation_request_id matches",
    snapshot.cancellation_request_id,
    cancellationRequest.id,
  );
  TestValidator.equals(
    "snapshot reason preserved from original request",
    snapshot.reason,
    "Customer requested cancellation for testing purposes",
  );
  TestValidator.equals(
    "snapshot status reflects APPROVED",
    snapshot.status,
    "APPROVED",
  );
  TestValidator.equals(
    "snapshot requested_at matches original",
    snapshot.requested_at,
    cancellationRequest.requested_at,
  );
  TestValidator.predicate(
    "snapshot responded_at is set",
    snapshot.responded_at !== null && snapshot.responded_at !== undefined,
  );
  TestValidator.predicate(
    "snapshot has responded seller",
    snapshot.responded_by_seller !== null &&
      snapshot.responded_by_seller !== undefined,
  );
  // Verify seller information in snapshot
  if (snapshot.responded_by_seller) {
    TestValidator.equals(
      "snapshot seller ID matches seller",
      snapshot.responded_by_seller.id,
      sellerJoin.id,
    );
    TestValidator.equals(
      "snapshot seller shop name preserved",
      snapshot.responded_by_seller.shop_name,
      sellerJoin.shop_name,
    );
  }
  // 8. Test descending sort order
  const snapshotsDesc =
    await api.functional.shoppingMall.customer.cancellation_request_snapshots.index(
      customerConnection,
      {
        body: {
          cancellationRequestId: cancellationRequest.id,
          sort: "created_at,desc",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsDesc);
  // Verify descending order returns same snapshots
  TestValidator.equals(
    "descending sort returns same record count",
    snapshotsDesc.data.length,
    snapshotsPage.data.length,
  );
  // 9. Verify chronological order (if multiple snapshots exist)
  if (snapshotsPage.data.length > 1) {
    for (let i = 1; i < snapshotsPage.data.length; i++) {
      const prevSnapshot = snapshotsPage.data[i - 1];
      const currSnapshot = snapshotsPage.data[i];
      TestValidator.predicate(
        `snapshot ${i} created after snapshot ${i - 1}`,
        new Date(currSnapshot.created_at).getTime() >=
          new Date(prevSnapshot.created_at).getTime(),
      );
    }
  }
  // 10. Verify snapshot immutability - created_at should be before or equal to responded_at
  if (snapshot.responded_at) {
    TestValidator.predicate(
      "snapshot created_at before or equal to responded_at",
      new Date(snapshot.created_at).getTime() <=
        new Date(snapshot.responded_at).getTime(),
    );
  }
  // 11. Verify requested_at is preserved across all snapshots
  for (const snap of snapshotsPage.data) {
    TestValidator.equals(
      "snapshot requested_at consistent",
      snap.requested_at,
      cancellationRequest.requested_at,
    );
    TestValidator.equals(
      "snapshot reason consistent across all snapshots",
      snap.reason,
      cancellationRequest.reason,
    );
  }
}
