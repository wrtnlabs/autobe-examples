import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_seller_products_create } from "../../../generate/generate_random_ecommerce_seller_products_create";
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";

export async function test_api_seller_order_items_empty_search_results(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 2. Create a product for the seller (but no orders)
  const product = await generate_random_ecommerce_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Test search with non-existent product variant ID
  const searchResult1 = await api.functional.ecommerce.seller.order_items.index(
    sellerConnection,
    {
      body: {
        product_variant_id: typia.random<string & tags.Format<"uuid">>(),
      },
    },
  );
  typia.assert(searchResult1);
  TestValidator.equals(
    "empty data array for non-existent variant",
    searchResult1.data,
    [],
  );
  TestValidator.equals(
    "zero records for non-existent variant",
    searchResult1.pagination.records,
    0,
  );
  TestValidator.equals(
    "correct pagination current page",
    searchResult1.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination pages should be 0",
    searchResult1.pagination.pages === 0,
  );
  // 4. Test search with a status that doesn't exist for this seller
  const searchResult2 = await api.functional.ecommerce.seller.order_items.index(
    sellerConnection,
    {
      body: {
        status: "shipped",
      },
    },
  );
  typia.assert(searchResult2);
  TestValidator.equals(
    "empty data array for non-existent status",
    searchResult2.data,
    [],
  );
  TestValidator.equals(
    "zero records for non-existent status",
    searchResult2.pagination.records,
    0,
  );
  // 5. Test search with invalid quantity range
  const searchResult3 = await api.functional.ecommerce.seller.order_items.index(
    sellerConnection,
    {
      body: {
        min_quantity: 100,
        max_quantity: 200,
      },
    },
  );
  typia.assert(searchResult3);
  TestValidator.equals(
    "empty data array for impossible quantity range",
    searchResult3.data,
    [],
  );
  TestValidator.equals(
    "zero records for impossible quantity range",
    searchResult3.pagination.records,
    0,
  );
  // 6. Test that response structure is consistent across all empty results
  TestValidator.equals(
    "consistent pagination structure across empty results",
    Object.keys(searchResult1.pagination).sort(),
    Object.keys(searchResult2.pagination).sort(),
  );
}
