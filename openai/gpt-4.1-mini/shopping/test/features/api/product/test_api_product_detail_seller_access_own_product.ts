import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductSubcategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSubcategory";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test that a seller can successfully retrieve details of their own product by productId.
 * This includes verifying that seller information in the response matches the authenticated seller's ID and shop profile.
 * Confirm authorization rules allow this access for sellers.
 * Validate that the product details returned are accurate for the seller's owned product.
 */
export async function test_api_product_detail_seller_access_own_product(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller joins and gets authorized
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shopName: RandomGenerator.name(1),
      shopDescription: null,
      logoUri: null,
    },
  });
  // 2. Setup authenticated seller connection
  const sellerConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${sellerAuthorized.token.access}` },
  };
  // 3. Since product creation endpoint is not accessible, attempt to access the product details
  // with a productId that MUST be owned by this authenticated seller to pass the test.
  // To simulate this realistically, we will use typia.random for productId but expect failure
  // or success if such product exists.
  // This test confirms access control for seller retrieving own product.
  // NOTE: This approach may fail if productId does not exist or not owned.
  // For demonstration, using seller's own id as a productId is invalid, must use random UUID.
  const productId = typia.random<string & tags.Format<"uuid">>();
  // 4. Try fetching product details
  let product: import("@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct").IShoppingMallProduct;
  try {
    product = await api.functional.shoppingMall.seller.products.at(
      sellerConnection,
      {
        productId,
      },
    );
  } catch (error) {
    // Could be 404 Not Found or authorization error - test fails
    throw error;
  }
  // 5. Validate product structure and seller info
  typia.assert(product);
  TestValidator.equals(
    "seller id matches authenticated seller",
    product.seller.id,
    sellerAuthorized.id,
  );
  TestValidator.equals(
    "seller shopName matches",
    product.seller.shopName,
    sellerAuthorized.shopName,
  );
  TestValidator.equals("product id matches request id", product.id, productId);
  TestValidator.predicate(
    "product basePrice non-negative",
    product.basePrice >= 0,
  );
  TestValidator.predicate("product name non-empty", product.name.length > 0);
}
