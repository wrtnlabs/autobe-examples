import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductOptionValue";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductOptionDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionDefinition";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallProductRating } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductRating";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
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
import { generate_random_shopping_mall_seller_products_option_definitions_create } from "../../../generate/generate_random_shopping_mall_seller_products_option_definitions_create";
import { generate_random_shopping_mall_seller_products_option_definitions_option_values_create } from "../../../generate/generate_random_shopping_mall_seller_products_option_definitions_option_values_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_option_definition } from "../../../prepare/prepare_random_shopping_mall_product_option_definition";
import { prepare_random_shopping_mall_product_option_value } from "../../../prepare/prepare_random_shopping_mall_product_option_value";

/**
 * Test that a seller can only access option values for products they own,
 * not products owned by other sellers.
 *
 * Setup:
 * 1. Authenticate as Seller A using authorize_seller_join utility
 * 2. Seller A creates a product using generate_random_shopping_mall_seller_products_create
 * 3. Seller A creates an option definition using generate_random_shopping_mall_seller_products_option_definitions_create
 * 4. Seller A adds option values using generate_random_shopping_mall_seller_products_option_definitions_option_values_create
 * 5. Authenticate as Seller B (different seller account) using authorize_seller_join
 * 6. Seller B creates their own product for completeness
 *
 * Execution:
 * - Attempt to call the PATCH endpoint using Seller B's connection but with
 *   Seller A's product ID and option definition ID
 *
 * Validation:
 * - Request is rejected with authorization error (HTTP 403)
 * - Seller B cannot access option values belonging to Seller A's product
 * - Access control properly validates product ownership through the option
 *   definition relationship
 */
export async function test_api_product_option_value_access_control(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup Seller A's connection and authenticate
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerAAuth = await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAAuth);
  // 2. Seller A creates a product
  const sellerAProduct =
    await generate_random_shopping_mall_seller_products_create(
      sellerAConnection,
      {},
    );
  typia.assert(sellerAProduct);
  // 3. Seller A creates an option definition for their product
  const sellerAOptionDefinition =
    await generate_random_shopping_mall_seller_products_option_definitions_create(
      sellerAConnection,
      {
        params: { productId: sellerAProduct.id },
        body: { name: "Color" },
      },
    );
  typia.assert(sellerAOptionDefinition);
  // 4. Seller A adds option values to their option definition
  const sellerACreatedOptionValues = await ArrayUtil.asyncRepeat(
    3,
    async () => {
      const optionValue =
        await generate_random_shopping_mall_seller_products_option_definitions_option_values_create(
          sellerAConnection,
          {
            params: {
              productId: sellerAProduct.id,
              optionDefinitionId: sellerAOptionDefinition.id,
            },
            body: {
              name: typia.random<string>(),
            },
          },
        );
      typia.assert(optionValue);
      return optionValue;
    },
  );
  // 5. Setup Seller B's connection and authenticate (different seller)
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerBAuth = await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerBAuth);
  // 6. Seller B creates their own product for completeness
  const sellerBProduct =
    await generate_random_shopping_mall_seller_products_create(
      sellerBConnection,
      {},
    );
  typia.assert(sellerBProduct);
  // 7. Test: Seller B attempts to access Seller A's option values
  // This should fail with authorization error (403)
  await TestValidator.error(
    "Seller B cannot access Seller A's option values",
    async () => {
      await api.functional.shoppingMall.seller.products.option_definitions.option_values.index(
        sellerBConnection,
        {
          productId: sellerAProduct.id,
          optionDefinitionId: sellerAOptionDefinition.id,
          body: {
            page: 1,
            limit: 10,
          },
        },
      );
    },
  );
  // 8. Verify Seller B CAN access their own product's option values
  // First create an option definition for Seller B's product
  const sellerBOptionDefinition =
    await generate_random_shopping_mall_seller_products_option_definitions_create(
      sellerBConnection,
      {
        params: { productId: sellerBProduct.id },
        body: { name: "Size" },
      },
    );
  typia.assert(sellerBOptionDefinition);
  // Add option values for Seller B
  await generate_random_shopping_mall_seller_products_option_definitions_option_values_create(
    sellerBConnection,
    {
      params: {
        productId: sellerBProduct.id,
        optionDefinitionId: sellerBOptionDefinition.id,
      },
      body: { name: "Large" },
    },
  );
  // Seller B should successfully access their own option values
  const sellerBOptionValues =
    await api.functional.shoppingMall.seller.products.option_definitions.option_values.index(
      sellerBConnection,
      {
        productId: sellerBProduct.id,
        optionDefinitionId: sellerBOptionDefinition.id,
        body: {
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(sellerBOptionValues);
  TestValidator.predicate(
    "Seller B can access their own option values",
    sellerBOptionValues.data.length > 0,
  );
  // 9. Verify Seller A can access their own option values
  const sellerARetrievedOptionValues =
    await api.functional.shoppingMall.seller.products.option_definitions.option_values.index(
      sellerAConnection,
      {
        productId: sellerAProduct.id,
        optionDefinitionId: sellerAOptionDefinition.id,
        body: {
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(sellerARetrievedOptionValues);
  TestValidator.equals(
    "Seller A's option values count matches",
    sellerARetrievedOptionValues.data.length,
    sellerACreatedOptionValues.length,
  );
}
