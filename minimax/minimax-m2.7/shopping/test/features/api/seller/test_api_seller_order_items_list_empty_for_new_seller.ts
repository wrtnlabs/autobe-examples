import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import type { IPageIEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_order_items_list_empty_for_new_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      href: "https://example.com/seller/register",
      referrer: "https://example.com",
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // 2. Call order items list with no filters - should return empty for new seller
  const emptyResult =
    await api.functional.ecommerceMall.seller.order_items.index(
      sellerConnection,
      {
        body: {} satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(emptyResult);
  // 3. Validate empty result with no filters
  TestValidator.equals("data array is empty", emptyResult.data.length, 0);
  TestValidator.equals(
    "total records is 0",
    emptyResult.pagination.pagination.records,
    0,
  );
  TestValidator.equals(
    "total pages is 0",
    emptyResult.pagination.pagination.pages,
    0,
  );
  // 4. Test all status filters - all should return empty for new seller
  const statuses = [
    "paid",
    "shipped",
    "delivered",
    "cancelled",
    "refunded",
  ] as const;
  for (const status of statuses) {
    const statusResult =
      await api.functional.ecommerceMall.seller.order_items.index(
        sellerConnection,
        {
          body: { status } satisfies IEcommerceMallOrderItem.IRequest,
        },
      );
    typia.assert(statusResult);
    TestValidator.equals(
      `no ${status} items for new seller`,
      statusResult.data.length,
      0,
    );
    TestValidator.equals(
      `no ${status} records for new seller`,
      statusResult.pagination.pagination.records,
      0,
    );
  }
  // 5. Test orderId filter with random UUID - should return empty
  const randomOrderId = typia.random<string & tags.Format<"uuid">>();
  const orderIdResult =
    await api.functional.ecommerceMall.seller.order_items.index(
      sellerConnection,
      {
        body: {
          orderId: randomOrderId,
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(orderIdResult);
  TestValidator.equals(
    "no items for non-existent orderId",
    orderIdResult.data.length,
    0,
  );
  TestValidator.equals(
    "no records for non-existent orderId",
    orderIdResult.pagination.pagination.records,
    0,
  );
}
