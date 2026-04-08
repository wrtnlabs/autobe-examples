import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_order_items_list_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller joins to obtain authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(seller);
  // 2. Create new connection with seller's access token
  const sellerAuthenticatedConnection: api.IConnection = {
    host: connection.host,
  };
  sellerAuthenticatedConnection.headers = {
    Authorization: seller.token.access,
  };
  // 3. Seller requests list of order items (no products created, should be empty)
  const orderItemsResponse: IPageIEcommerceMallOrderItem.ISummary =
    await api.functional.ecommerceMall.seller.order_items.index(
      sellerAuthenticatedConnection,
      {
        body: {},
      },
    );
  typia.assert(orderItemsResponse);
  // 4. Verify empty results with correct pagination metadata
  TestValidator.equals(
    "order items data array is empty",
    orderItemsResponse.data.length,
    0,
  );
  TestValidator.equals(
    "pagination current page is 1",
    orderItemsResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is default 20",
    orderItemsResponse.pagination.limit,
    20,
  );
  TestValidator.equals(
    "pagination records is 0",
    orderItemsResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages is 0",
    orderItemsResponse.pagination.pages,
    0,
  );
}
