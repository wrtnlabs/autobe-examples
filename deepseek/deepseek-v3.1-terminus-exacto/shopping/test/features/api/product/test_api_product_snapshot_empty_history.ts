import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductSnapshot";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceProductSnapshot";
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

export async function test_api_product_snapshot_empty_history(
  connection: api.IConnection,
): Promise<void> {
  // Create seller connection and register seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // Create a new product using the utility function
  const product = await generate_random_ecommerce_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // Retrieve snapshots for the newly created product (should be empty)
  const snapshots = await api.functional.ecommerce.seller.products.snapshots.at(
    sellerConnection,
    {
      productId: product.id,
    },
  );
  typia.assert(snapshots);
  // Validate pagination metadata for empty result
  TestValidator.equals(
    "pagination current page should be 1",
    snapshots.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit should be positive",
    snapshots.pagination.limit > 0,
  );
  TestValidator.equals(
    "pagination records should be 0 for new product",
    snapshots.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages should be 0 for zero records",
    snapshots.pagination.pages,
    0,
  );
  // Validate empty data array
  TestValidator.equals(
    "snapshots data should be empty array",
    snapshots.data.length,
    0,
  );
}
