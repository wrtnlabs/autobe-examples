import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import type { IPageIEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProduct";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

export async function test_api_product_search_deleted_and_variant_states(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 2. Create 3 products with unique searchable names
  const productNames = [
    `Deleted Product - ${RandomGenerator.alphaNumeric(8)}`,
    `Product With Stock - ${RandomGenerator.alphaNumeric(8)}`,
    `Product Without Variants - ${RandomGenerator.alphaNumeric(8)}`,
  ];
  const product1 = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    { body: { name: productNames[0], basePrice: 10000 } as any },
  );
  typia.assert(product1);
  const product2 = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    { body: { name: productNames[1], basePrice: 20000 } as any },
  );
  typia.assert(product2);
  const product3 = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    { body: { name: productNames[2], basePrice: 30000 } as any },
  );
  typia.assert(product3);
  // 3. Delete product1 (soft-delete)
  await api.functional.ecommerceMall.seller.products.erase(sellerConnection, {
    productId: product1.id,
  });
  // 4. Search for products and verify deleted product is excluded
  const searchResult = await api.functional.ecommerceMall.products.index(
    connection,
    {
      body: {
        q: productNames[0].split(" - ")[0],
        page: 1,
        limit: 20,
      } satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(searchResult);
  // Validate deleted product is NOT in search results
  const deletedProductFound = searchResult.data.some(
    (p) => p.id === product1.id,
  );
  TestValidator.equals(
    "deleted product excluded from search",
    deletedProductFound,
    false,
  );
  // Validate remaining products ARE in search results
  const product2Found = searchResult.data.some((p) => p.id === product2.id);
  TestValidator.equals("product2 in search results", product2Found, true);
  const product3Found = searchResult.data.some((p) => p.id === product3.id);
  TestValidator.equals("product3 in search results", product3Found, true);
  // 5. Search with no filter to verify all active products
  const allProductsResult = await api.functional.ecommerceMall.products.index(
    connection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(allProductsResult);
  // Verify all active products are present
  const allProductIds = allProductsResult.data.map((p) => p.id);
  TestValidator.equals(
    "product2 in all products",
    allProductIds.includes(product2.id),
    true,
  );
  TestValidator.equals(
    "product3 in all products",
    allProductIds.includes(product3.id),
    true,
  );
  TestValidator.equals(
    "deleted product not in all products",
    allProductIds.includes(product1.id),
    false,
  );
  // 6. Validate product summary fields
  const product3Summary = allProductsResult.data.find(
    (p) => p.id === product3.id,
  );
  if (product3Summary) {
    typia.assert(product3Summary);
    TestValidator.equals(
      "product3 has_stock is false (no variants)",
      product3Summary.hasStock,
      false,
    );
    TestValidator.equals(
      "min_variant_price equals base_price when no variants",
      product3Summary.minVariantPrice,
      product3.basePrice,
    );
    TestValidator.equals(
      "max_variant_price equals base_price when no variants",
      product3Summary.maxVariantPrice,
      product3.basePrice,
    );
    TestValidator.equals(
      "product3 name matches",
      product3Summary.name,
      productNames[2],
    );
    TestValidator.equals(
      "product3 base price matches",
      product3Summary.basePrice,
      30000,
    );
  }
  // 7. Validate product2 summary fields
  const product2Summary = allProductsResult.data.find(
    (p) => p.id === product2.id,
  );
  if (product2Summary) {
    typia.assert(product2Summary);
    TestValidator.equals(
      "product2 name matches",
      product2Summary.name,
      productNames[1],
    );
    TestValidator.equals(
      "product2 base price matches",
      product2Summary.basePrice,
      20000,
    );
    // has_stock depends on whether variants with stock exist
    // For newly created products without variants, should be false
    TestValidator.equals(
      "product2 has_stock is false (no variants)",
      product2Summary.hasStock,
      false,
    );
  }
}
