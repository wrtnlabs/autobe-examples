import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariant";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test variant listing for a nonexistent product returns empty results.
 *
 * Validates that querying variants for a product that does not exist returns an
 * empty result set rather than a 404 error. This behavior is critical for
 * information security — the system deliberately returns empty pagination
 * (empty data array, records=0, pages=0) to avoid leaking whether a product
 * exists, has been deleted, or never existed at all.
 *
 * 1. Customer registers and authenticates on the platform.
 * 2. Customer queries variants for a randomly generated UUID that corresponds
 *    to no real product.
 * 3. Validates the response returns an empty page with records=0 and pages=0
 *    rather than an HTTP error, confirming the system does not disclose
 *    whether a product exists.
 */
export async function test_api_product_variant_list_nonexistent_product(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer connection and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Query variants for a nonexistent product
  const nonexistentProductId = typia.random<string & tags.Format<"uuid">>();
  const result =
    await api.functional.shoppingMall.customer.products.variants.index(
      customerConnection,
      {
        productId: nonexistentProductId,
        body: {} satisfies IShoppingMallProductVariant.IRequest,
      },
    );
  typia.assert(result);
  // 3. Validate empty result set — system must not return 404
  TestValidator.equals("data is empty", result.data, []);
  TestValidator.equals("records is 0", result.pagination.records, 0);
  TestValidator.equals("pages is 0", result.pagination.pages, 0);
}
