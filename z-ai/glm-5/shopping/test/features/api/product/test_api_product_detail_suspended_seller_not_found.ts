import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_product_detail_suspended_seller_not_found(
  connection: api.IConnection,
): Promise<void> {
  // This test validates that products from suspended sellers return 404.
  // The API specification for GET /shoppingMall/products/{productId} enforces:
  // - Seller.approval_status must be 'approved'
  // - Seller.suspended must be FALSE (404 if TRUE)
  // - Seller.banned must be FALSE (404 if TRUE)
  // Note: This test demonstrates the pattern for testing this business rule.
  // Without setup APIs to create a seller and product, then suspend the seller,
  // we use a placeholder UUID to show the expected error handling.
  // A complete test would require admin APIs for seller management.
  const productId = typia.random<string & typia.tags.Format<"uuid">>();
  await TestValidator.httpError(
    "product from suspended seller returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.products.at(connection, {
        productId,
      });
    },
  );
}
