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

export async function test_api_seller_order_items_list_basic(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller connection and join
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  // 2. List order items (will be empty since no orders exist)
  const response = await api.functional.ecommerceMall.seller.order_items.index(
    sellerConnection,
    {
      body: {
        page: null,
        limit: 20,
      },
    },
  );
  typia.assert(response);
  // 3. Validate pagination metadata for empty result
  TestValidator.equals("pagination current", response.pagination.current, 1);
  TestValidator.equals("pagination limit", response.pagination.limit, 20);
  TestValidator.equals("pagination records", response.pagination.records, 0);
  TestValidator.equals("pagination pages", response.pagination.pages, 0);
  // 4. Validate empty data array
  TestValidator.equals("order items count", response.data.length, 0);
  // 5. Test with different page parameters
  const responseWithPage =
    await api.functional.ecommerceMall.seller.order_items.index(
      sellerConnection,
      {
        body: {
          page: "test-cursor",
          limit: 50,
        },
      },
    );
  typia.assert(responseWithPage);
  TestValidator.equals(
    "pagination with custom page - current",
    responseWithPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination with custom page - limit",
    responseWithPage.pagination.limit,
    50,
  );
}