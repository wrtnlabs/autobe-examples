import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipment";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_pending_shipments_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create seller connection
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      name: RandomGenerator.name(2),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shopName: RandomGenerator.name(3),
      shopDescription: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IShoppingMallSeller.IJoin,
  });
  // Test pagination with default parameters
  const firstPage =
    await api.functional.shoppingMall.seller.seller.shipments.pending.index(
      sellerConnection,
    );
  typia.assert(firstPage);
  // Validate pagination structure
  TestValidator.predicate("has pagination", firstPage.pagination !== undefined);
  TestValidator.equals("current page is 1", firstPage.pagination.current, 1);
  TestValidator.equals(
    "limit is 10 by default",
    firstPage.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "records count is non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    firstPage.pagination.pages >= 0,
  );
  // Verify data array structure
  TestValidator.predicate("has data array", Array.isArray(firstPage.data));
  if (firstPage.data.length > 0) {
    typia.assert(firstPage.data[0]);
  }
  // Test with custom limit parameter
  const customLimitPage =
    await api.functional.shoppingMall.seller.seller.shipments.pending.index(
      sellerConnection,
    );
  typia.assert(customLimitPage);
  // Test second page if available
  if (firstPage.pagination.pages > 1) {
    const secondPage =
      await api.functional.shoppingMall.seller.seller.shipments.pending.index(
        sellerConnection,
      );
    typia.assert(secondPage);
    TestValidator.equals(
      "second page number",
      secondPage.pagination.current,
      2,
    );
  }
}
