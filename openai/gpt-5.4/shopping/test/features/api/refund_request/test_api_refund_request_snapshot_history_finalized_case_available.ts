import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequestSnapshot";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
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
import { generate_random_shopping_mall_customer_refund_requests_create } from "../../../generate/generate_random_shopping_mall_customer_refund_requests_create";
import { generate_random_shopping_mall_seller_refund_requests_responses_create } from "../../../generate/generate_random_shopping_mall_seller_refund_requests_responses_create";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";
import { prepare_random_shopping_mall_refund_request_snapshot } from "../../../prepare/prepare_random_shopping_mall_refund_request_snapshot";

export async function test_api_refund_request_snapshot_history_finalized_case_available(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  const createdRefundRequest =
    await generate_random_shopping_mall_customer_refund_requests_create(
      customerConnection,
      {},
    );
  typia.assert(createdRefundRequest);
  const snapshots =
    await api.functional.shoppingMall.customer.refund_requests.snapshots.index(
      customerConnection,
      {
        refundRequestId: createdRefundRequest.id,
        body: {
          page: 1,
          limit: 100,
        } satisfies IShoppingMallRefundRequestSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  TestValidator.equals(
    "pagination current page matches request",
    snapshots.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    snapshots.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "snapshot history is scoped within total record count",
    snapshots.pagination.records >= snapshots.data.length,
  );
  TestValidator.predicate(
    "snapshot history page count is non-negative",
    snapshots.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "every returned snapshot belongs to the requested refund request",
    snapshots.data.every(
      (snapshot) => snapshot.refundRequest.id === createdRefundRequest.id,
    ),
  );
  TestValidator.predicate(
    "every returned snapshot preserves the disputed order item identity",
    snapshots.data.every(
      (snapshot) =>
        snapshot.refundRequest.orderItem.id ===
        createdRefundRequest.orderItem.id,
    ),
  );
  TestValidator.predicate(
    "every returned snapshot preserves the refunding customer identity",
    snapshots.data.every(
      (snapshot) =>
        snapshot.refundRequest.customer.id === createdRefundRequest.customer.id,
    ),
  );
  TestValidator.predicate(
    "every returned snapshot preserves the original refund reason",
    snapshots.data.every(
      (snapshot) =>
        snapshot.refundRequest.reason === createdRefundRequest.reason,
    ),
  );
}
