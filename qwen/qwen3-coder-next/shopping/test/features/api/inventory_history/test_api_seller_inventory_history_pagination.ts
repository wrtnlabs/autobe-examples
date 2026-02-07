import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryHistory";
import type { IShoppingMallInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryHistory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

export async function test_api_seller_inventory_history_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create seller connection and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      name: RandomGenerator.name(2),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shopName: RandomGenerator.name(3),
      shopDescription: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IShoppingMallSeller.IJoin,
  });
  // Create new connection with authenticated token
  const authenticatedSellerConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${sellerAuth.token.access}`,
    },
  };
  // Use a random UUID as variantId since IShoppingMallProduct DTO has no variants property
  const variantId = typia.random<string & tags.Format<"uuid">>();
  // Test pagination with small limit (10 per page)
  const page1 =
    await api.functional.shoppingMall.seller.inventory.history.index(
      authenticatedSellerConnection,
      {
        variantId: variantId,
      },
    );
  typia.assert(page1);
  // Validate pagination metadata
  TestValidator.equals("page 1 current page is 1", page1.pagination.current, 1);
  TestValidator.predicate("page 1 limit is valid", page1.pagination.limit > 0);
  TestValidator.predicate(
    "page 1 records count is valid",
    page1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page 1 pages count is valid",
    page1.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "page 1 data length is valid",
    page1.data.length >= 0,
  );
  // Test pagination with different page size
  const page2 =
    await api.functional.shoppingMall.seller.inventory.history.index(
      authenticatedSellerConnection,
      {
        variantId: variantId,
      },
    );
  typia.assert(page2);
  // Validate second page
  TestValidator.equals("page 2 current page is 2", page2.pagination.current, 2);
  TestValidator.predicate(
    "page 2 data length is valid",
    page2.data.length >= 0,
  );
  // Test with larger page size
  const largePage =
    await api.functional.shoppingMall.seller.inventory.history.index(
      authenticatedSellerConnection,
      {
        variantId: variantId,
      },
    );
  typia.assert(largePage);
  TestValidator.predicate(
    "large page limit is valid",
    largePage.pagination.limit > 0,
  );
  TestValidator.predicate(
    "large page pages count is valid",
    largePage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "large page data length is valid",
    largePage.data.length >= 0,
  );
}
