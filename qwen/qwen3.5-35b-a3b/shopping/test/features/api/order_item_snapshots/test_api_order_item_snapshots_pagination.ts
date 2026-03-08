import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItemSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_order_item_snapshots_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(seller);
  // 2. Test page=1 with pageSize=20
  const page1 =
    await api.functional.ecommerceMall.seller.orderItemSnapshots.index(
      sellerConnection,
      {
        body: {
          page: 1,
          pageSize: 20,
        } satisfies IEcommerceMallOrderItemSnapshot.IRequest,
      },
    );
  typia.assert(page1);
  TestValidator.equals("page1 current", page1.pagination.current, 1);
  TestValidator.equals("page1 limit", page1.pagination.limit, 20);
  TestValidator.predicate("page1 has records", page1.pagination.records > 0);
  const expectedPage1Data =
    page1.pagination.records > 20 ? 20 : page1.pagination.records;
  TestValidator.equals(
    "page1 data length",
    page1.data.length,
    expectedPage1Data,
  );
  // 3. Test page=2 with pageSize=20
  const page2 =
    await api.functional.ecommerceMall.seller.orderItemSnapshots.index(
      sellerConnection,
      {
        body: {
          page: 2,
          pageSize: 20,
        } satisfies IEcommerceMallOrderItemSnapshot.IRequest,
      },
    );
  typia.assert(page2);
  TestValidator.equals("page2 current", page2.pagination.current, 2);
  TestValidator.equals("page2 limit", page2.pagination.limit, 20);
  // 4. Test page=3 with pageSize=20
  const page3 =
    await api.functional.ecommerceMall.seller.orderItemSnapshots.index(
      sellerConnection,
      {
        body: {
          page: 3,
          pageSize: 20,
        } satisfies IEcommerceMallOrderItemSnapshot.IRequest,
      },
    );
  typia.assert(page3);
  TestValidator.equals("page3 current", page3.pagination.current, 3);
  TestValidator.equals("page3 limit", page3.pagination.limit, 20);
  // 5. Test edge case: page=0 should default to page=1
  const pageZero =
    await api.functional.ecommerceMall.seller.orderItemSnapshots.index(
      sellerConnection,
      {
        body: {
          page: 0,
          pageSize: 20,
        } satisfies IEcommerceMallOrderItemSnapshot.IRequest,
      },
    );
  typia.assert(pageZero);
  TestValidator.equals("page0 default to 1", pageZero.pagination.current, 1);
  // 6. Test edge case: pageSize=100 returns max 100 per page
  const pageLarge =
    await api.functional.ecommerceMall.seller.orderItemSnapshots.index(
      sellerConnection,
      {
        body: {
          page: 1,
          pageSize: 100,
        } satisfies IEcommerceMallOrderItemSnapshot.IRequest,
      },
    );
  typia.assert(pageLarge);
  TestValidator.equals("large page limit", pageLarge.pagination.limit, 100);
  TestValidator.predicate(
    "large page data <= 100",
    pageLarge.data.length <= 100,
  );
  // 7. Test edge case: page beyond total pages returns empty data
  const pageOverflow =
    await api.functional.ecommerceMall.seller.orderItemSnapshots.index(
      sellerConnection,
      {
        body: {
          page: 100,
          pageSize: 20,
        } satisfies IEcommerceMallOrderItemSnapshot.IRequest,
      },
    );
  typia.assert(pageOverflow);
  TestValidator.equals(
    "overflow page current",
    pageOverflow.pagination.current,
    100,
  );
  TestValidator.equals("overflow page empty data", pageOverflow.data.length, 0);
}
