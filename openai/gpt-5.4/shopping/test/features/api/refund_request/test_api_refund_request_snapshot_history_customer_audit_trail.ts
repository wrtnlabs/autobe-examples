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
import { generate_random_shopping_mall_customer_refund_requests_create } from "../../../generate/generate_random_shopping_mall_customer_refund_requests_create";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";

export async function test_api_refund_request_snapshot_history_customer_audit_trail(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = {
    host: connection.host,
  };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  const refundRequest =
    await generate_random_shopping_mall_customer_refund_requests_create(
      customerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(refundRequest);
  const request = {
    page: 1 satisfies number as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 satisfies number as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  } satisfies IShoppingMallRefundRequestSnapshot.IRequest;
  const snapshotsPage =
    await api.functional.shoppingMall.customer.refund_requests.snapshots.index(
      customerConnection,
      {
        refundRequestId: refundRequest.id,
        body: request,
      },
    );
  typia.assert(snapshotsPage);
  TestValidator.equals(
    "current page matches request",
    snapshotsPage.pagination.current,
    request.page,
  );
  TestValidator.equals(
    "limit matches request",
    snapshotsPage.pagination.limit,
    request.limit,
  );
  TestValidator.equals(
    "page data count does not exceed limit",
    snapshotsPage.data.length <= snapshotsPage.pagination.limit,
    true,
  );
  TestValidator.equals(
    "total pages formula is consistent",
    snapshotsPage.pagination.pages,
    snapshotsPage.pagination.limit === 0
      ? 0
      : Math.ceil(
          snapshotsPage.pagination.records / snapshotsPage.pagination.limit,
        ),
  );
  const snapshotIds = snapshotsPage.data.map((snapshot) => snapshot.id);
  TestValidator.equals(
    "snapshot ids are unique within page",
    new Set(snapshotIds).size,
    snapshotIds.length,
  );
  for (const snapshot of snapshotsPage.data) {
    TestValidator.equals(
      "snapshot belongs to requested refund request",
      snapshot.refundRequest.id,
      refundRequest.id,
    );
    TestValidator.equals(
      "snapshot preserves same order item",
      snapshot.refundRequest.orderItem.id,
      refundRequest.orderItem.id,
    );
    TestValidator.equals(
      "snapshot preserves same customer owner",
      snapshot.refundRequest.customer.id,
      refundRequest.customer.id,
    );
    TestValidator.equals(
      "snapshot preserves authorized customer owner",
      snapshot.refundRequest.customer.id,
      customer.id,
    );
    if (snapshot.reviewer_actor_id !== null) {
      TestValidator.notEquals(
        "reviewer actor is distinct from customer actor",
        snapshot.reviewer_actor_id,
        customer.id,
      );
    }
  }
}
