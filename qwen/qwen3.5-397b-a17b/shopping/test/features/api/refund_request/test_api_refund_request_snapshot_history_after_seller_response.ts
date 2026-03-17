import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequestSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestSnapshot";
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
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_customer_refund_requests_create } from "../../../generate/generate_random_shopping_mall_customer_refund_requests_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";

/**
 * Test refund request snapshot history after seller response.
 *
 * This test validates the complete audit trail of a refund request:
 * 1. Customer creates refund request for delivered order item
 * 2. Seller responds to refund request (approve/reject)
 * 3. Customer retrieves snapshot history showing status progression
 * 4. Validates snapshot integrity and chronological ordering
 */
export async function test_api_refund_request_snapshot_history_after_seller_response(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer setup - register and login
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    },
  });
  typia.assert(customerAuth);
  // 2. Seller setup - register and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  // 3. Create refund request using utility function
  // The prepare function handles order_item_id generation internally
  const refundRequest =
    await generate_random_shopping_mall_customer_refund_requests_create(
      customerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(refundRequest);
  // 4. Seller responds to refund request (approve it)
  const sellerResponse =
    await api.functional.shoppingMall.seller.refund_requests.update(
      sellerConnection,
      {
        refundRequestId: refundRequest.id,
        body: {
          status: "APPROVED",
        },
      },
    );
  typia.assert(sellerResponse);
  // Validate seller response
  TestValidator.equals(
    "refund status after approval",
    sellerResponse.status,
    "APPROVED",
  );
  TestValidator.notEquals(
    "seller responded",
    sellerResponse.responded_by_seller_id,
    null,
  );
  TestValidator.notEquals(
    "response timestamp set",
    sellerResponse.responded_at,
    null,
  );
  // 5. Customer retrieves snapshot history
  const snapshotHistory =
    await api.functional.shoppingMall.customer.refund_requests.snapshots.list(
      customerConnection,
      {
        requestId: refundRequest.id,
      },
    );
  typia.assert(snapshotHistory);
  // 6. Validate snapshot history structure
  TestValidator.predicate("has snapshots", snapshotHistory.data.length >= 1);
  TestValidator.equals(
    "pagination current page",
    snapshotHistory.pagination.current,
    1,
  );
  TestValidator.predicate(
    "records count matches data",
    snapshotHistory.pagination.records >= snapshotHistory.data.length,
  );
  // 7. Validate snapshot ordering (newest first - descending by snapshot_at)
  if (snapshotHistory.data.length >= 2) {
    for (let i = 0; i < snapshotHistory.data.length - 1; i++) {
      const currentSnapshot = snapshotHistory.data[i];
      const nextSnapshot = snapshotHistory.data[i + 1];
      TestValidator.predicate(
        `snapshot ${i} is newer than ${i + 1}`,
        new Date(currentSnapshot.snapshot_at).getTime() >=
          new Date(nextSnapshot.snapshot_at).getTime(),
      );
    }
  }
  // 8. Validate latest snapshot contains seller response information
  const latestSnapshot = snapshotHistory.data[0];
  TestValidator.equals(
    "latest snapshot status",
    latestSnapshot.status,
    "APPROVED",
  );
  TestValidator.equals(
    "reason preserved",
    latestSnapshot.reason,
    refundRequest.reason,
  );
  TestValidator.notEquals(
    "seller info present",
    latestSnapshot.respondedBySeller,
    null,
  );
  TestValidator.notEquals(
    "response timestamp in snapshot",
    latestSnapshot.responded_at,
    null,
  );
  // 9. Validate snapshot contains customer information
  TestValidator.equals(
    "customer id matches",
    latestSnapshot.customer.id,
    customerAuth.id,
  );
  TestValidator.equals(
    "customer email matches",
    latestSnapshot.customer.email,
    customerAuth.email,
  );
  // 10. Validate seller information in snapshot
  if (latestSnapshot.respondedBySeller) {
    TestValidator.equals(
      "seller id matches",
      latestSnapshot.respondedBySeller.id,
      sellerAuth.id,
    );
    TestValidator.equals(
      "seller shop name preserved",
      latestSnapshot.respondedBySeller.shop_name,
      sellerAuth.shop_name,
    );
  }
}
