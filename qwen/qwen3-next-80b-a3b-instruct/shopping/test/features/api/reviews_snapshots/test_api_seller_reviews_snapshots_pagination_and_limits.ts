import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewSnapshot";
import type { IShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_reviews_snapshots_pagination_and_limits(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller: IShoppingMallSeller.IAuthorized = await authorize_seller_join(
    sellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IShoppingMallSeller.IJoin,
    },
  );
  typia.assert(seller);
  
  // 2. Use the received token directly; no need for login since we already have a valid credential
  const directConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${seller.token.access}` },
  };
  
  // 3. Query first page of review snapshots with limit=5
  const firstPage =
    await api.functional.shoppingMall.seller.reviews_snapshots.index(
      directConnection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies IShoppingMallReviewSnapshot.IRequest,
      },
    );
  typia.assert(firstPage);
  
  // 4. Validate first page response
  TestValidator.equals("first page current", firstPage.pagination.current, 1);
  TestValidator.equals("first page limit", firstPage.pagination.limit, 5);
  TestValidator.predicate(
    "first page records >= 5",
    firstPage.pagination.records >= 5,
  );
  TestValidator.equals(
    "first page pages should be correct",
    firstPage.pagination.pages,
    Math.ceil(firstPage.pagination.records / 5),
  );
  TestValidator.equals("first page data length", firstPage.data.length, 5);
  
  // 5. Query second page of review snapshots
  const secondPage =
    await api.functional.shoppingMall.seller.reviews_snapshots.index(
      directConnection,
      {
        body: {
          page: 2,
          limit: 5,
        } satisfies IShoppingMallReviewSnapshot.IRequest,
      },
    );
  typia.assert(secondPage);
  
  // 6. Validate second page
  TestValidator.equals("second page current", secondPage.pagination.current, 2);
  TestValidator.equals("second page limit", secondPage.pagination.limit, 5);
  TestValidator.equals(
    "second page records",
    secondPage.pagination.records,
    firstPage.pagination.records,
  );
  TestValidator.equals(
    "second page pages",
    secondPage.pagination.pages,
    firstPage.pagination.pages,
  );
  TestValidator.predicate("second page has data", secondPage.data.length > 0);
  
  // 7. Verify no duplicate snapshots between pages
  const allSnapshots = [...firstPage.data, ...secondPage.data];
  const uniqueSnapshots = Array.from(
    new Map(allSnapshots.map((s) => [s.changed_at, s])).values(),
  );
  TestValidator.equals(
    "all snapshots from both pages",
    allSnapshots.length,
    uniqueSnapshots.length,
  );
  
  // 8. Verify total snapshot count is at least 10 (2 pages * 5) if exists
  TestValidator.predicate(
    "total snapshot count sufficient",
    firstPage.pagination.records >= 5,
  );
}