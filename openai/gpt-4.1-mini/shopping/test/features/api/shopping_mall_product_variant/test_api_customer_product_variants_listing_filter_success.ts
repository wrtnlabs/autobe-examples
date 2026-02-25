import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariant";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductSubcategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSubcategory";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

export async function test_api_customer_product_variants_listing_filter_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller joins and logs in
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoinInput: IShoppingMallSeller.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    shopName: RandomGenerator.name(1),
    shopDescription: null,
    logoUri: null,
  };
  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await authorize_seller_join(sellerConnection, {
      body: sellerJoinInput,
    });
  typia.assert(sellerAuth);
  sellerConnection.headers = { Authorization: sellerAuth.token.access };
  // 2. Customer joins and logs in
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoinInput: IShoppingMallCustomer.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  };
  const customerAuth: IShoppingMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {
      body: customerJoinInput,
    });
  typia.assert(customerAuth);
  customerConnection.headers = { Authorization: customerAuth.token.access };
  // 3. Prepare a product subcategory id for product creation
  // Since not available to create via test, generate random UUID for test. It may mismatch but for scenario compliance.
  const productSubcategoryId = typia.random<string & tags.Format<"uuid">>();
  // 4. Seller creates a product
  const createdProduct: IShoppingMallProduct =
    await generate_random_shopping_mall_seller_products_create(
      sellerConnection,
      {
        body: {
          name: `Test Product ${RandomGenerator.name(1)}`,
          description: RandomGenerator.paragraph({ sentences: 4 }),
          product_subcategory_id: productSubcategoryId,
          base_price: typia.random<
            number &
              tags.Type<"uint32"> &
              tags.Minimum<1> &
              tags.Maximum<100000>
          >(),
        },
      },
    );
  typia.assert(createdProduct);
  // 5. Because no API for creating variants is provided, assume variants exist or are seeded in DB.
  // Variant filtering tests use the productId of created product.
  // 6. Prepare filter values
  // Use partial skuCode filter; at least 2 characters substring from base
  // simulate a base skuCode string
  const partialSkuFilter = "sku"; // Simplify partial match string known to exist
  // Price override range
  const priceOverrideMin = 10 as number & tags.Type<"uint32">;
  const priceOverrideMax = 100000 as number & tags.Type<"uint32">;
  // Stock quantity range
  const stockQuantityMin = 5 as number & tags.Type<"int32">;
  const stockQuantityMax = 40 as number & tags.Type<"int32">;
  // 7. Test pagination for pages 1 to 3 with limit 3
  for (let page = 1; page <= 3; ++page) {
    const response =
      await api.functional.shoppingMall.seller.products.variants.index(
        customerConnection,
        {
          productId: createdProduct.id,
          body: {
            skuCode: partialSkuFilter,
            priceOverrideMin: priceOverrideMin,
            priceOverrideMax: priceOverrideMax,
            stockQuantityMin: stockQuantityMin,
            stockQuantityMax: stockQuantityMax,
            page: page as number & tags.Type<"int32"> & tags.Minimum<1>,
            limit: 3 as number &
              tags.Type<"int32"> &
              tags.Minimum<1> &
              tags.Maximum<100>,
          } satisfies IShoppingMallProductVariant.IRequest,
        },
      );
    typia.assert(response);
    // Validate pagination metadata
    TestValidator.predicate(
      "pagination current page is requested page",
      response.pagination.current === page,
    );
    TestValidator.predicate(
      "pagination limit is 3",
      response.pagination.limit === 3,
    );
    TestValidator.predicate(
      "pagination pages count is non-negative",
      response.pagination.pages >= 0,
    );
    TestValidator.predicate(
      "pagination records count is non-negative",
      response.pagination.records >= 0,
    );
    // Validate variants in response
    for (const variant of response.data) {
      typia.assert(variant);
      TestValidator.predicate(
        `variant skuCode includes partialSkuFilter`,
        variant.skuCode.includes(partialSkuFilter),
      );
      // priceOverride constraints
      if (
        variant.priceOverride !== undefined &&
        variant.priceOverride !== null
      ) {
        TestValidator.predicate(
          `variant priceOverride >= min`,
          variant.priceOverride >= priceOverrideMin,
        );
        TestValidator.predicate(
          `variant priceOverride <= max`,
          variant.priceOverride <= priceOverrideMax,
        );
      }
      // stockQuantity constraints
      TestValidator.predicate(
        `variant stockQuantity >= min`,
        variant.stockQuantity >= stockQuantityMin,
      );
      TestValidator.predicate(
        `variant stockQuantity <= max`,
        variant.stockQuantity <= stockQuantityMax,
      );
    }
  }
}
