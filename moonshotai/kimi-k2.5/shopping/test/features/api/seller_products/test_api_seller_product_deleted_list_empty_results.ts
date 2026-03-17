import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProduct";
import type { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test retrieving deleted products list for a seller with no deleted products.
 *
 * This test validates that an authenticated seller who has never deleted any
 * products receives an empty result when querying their deleted products list.
 * The endpoint should return an empty data array with proper pagination metadata
 * showing zero records and zero pages, demonstrating graceful handling of
 * empty result sets.
 *
 * Scenario:
 * 1. Register a new seller account with no product history
 * 2. Call the deleted products endpoint
 * 3. Validate response contains empty data array
 * 4. Validate pagination shows zero records and pages
 */
export async function test_api_seller_product_deleted_list_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller connection with a new seller who has no deleted products
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // 2. Call the deleted products endpoint with empty request
  const response =
    await api.functional.ecommerceMall.seller.products.deleted.index(
      sellerConnection,
      {
        body: {} satisfies IEcommerceMallProduct.IRequest,
      },
    );
  typia.assert(response);
  // 3. Validate empty data array
  TestValidator.equals("data should be empty", response.data, []);
  // 4. Validate pagination shows zero records
  TestValidator.equals(
    "pagination records should be zero",
    response.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages should be zero",
    response.pagination.pages,
    0,
  );
  TestValidator.equals(
    "pagination current should be 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", response.pagination.limit, 20);
}
