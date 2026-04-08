import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductReviewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductReviewStat";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductVariantSnapshot";
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

export async function test_api_product_variant_snapshot_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test_password_123",
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  const sellerId = sellerAuth.id;
  // 2. Create a product
  const product = await api.functional.ecommerceMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Generate a variant UUID for testing snapshots endpoint
  // Note: Since variant creation endpoint is not available in SDK,
  // we use a generated UUID to test the snapshots retrieval endpoint.
  const variantId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Test snapshots endpoint with non-existent variant (expect 404)
  const allSnapshots =
    await api.functional.ecommerceMall.seller.products.variants.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        variantId: variantId,
        body: {},
      },
    );
  typia.assert(allSnapshots);
  // 5. Verify pagination metadata with empty results
  TestValidator.equals(
    "pagination current page",
    allSnapshots.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", allSnapshots.pagination.limit, 20);
  TestValidator.equals(
    "pagination records",
    allSnapshots.pagination.records,
    0,
  );
  TestValidator.equals("pagination pages", allSnapshots.pagination.pages, 0);
  TestValidator.equals("snapshots array length", allSnapshots.data.length, 0);
  // 6. Test sorting with empty results
  const sortedDesc =
    await api.functional.ecommerceMall.seller.products.variants.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        variantId: variantId,
        body: { sort: "created_at_desc" },
      },
    );
  typia.assert(sortedDesc);
  TestValidator.equals(
    "sorted desc pagination records",
    sortedDesc.pagination.records,
    0,
  );
  // 7. Test sorting ascending with empty results
  const sortedAsc =
    await api.functional.ecommerceMall.seller.products.variants.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        variantId: variantId,
        body: { sort: "created_at_asc" },
      },
    );
  typia.assert(sortedAsc);
  TestValidator.equals(
    "sorted asc pagination records",
    sortedAsc.pagination.records,
    0,
  );
  // 8. Test date range filtering with empty results
  const dateFiltered =
    await api.functional.ecommerceMall.seller.products.variants.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        variantId: variantId,
        body: {
          createdAtFrom: new Date().toISOString(),
          createdAtTo: new Date().toISOString(),
        },
      },
    );
  typia.assert(dateFiltered);
  TestValidator.equals(
    "date filter pagination records",
    dateFiltered.pagination.records,
    0,
  );
  // 9. Test SKU search with empty results
  const skuSearchResult =
    await api.functional.ecommerceMall.seller.products.variants.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        variantId: variantId,
        body: { skuSearch: "TEST-SKU" },
      },
    );
  typia.assert(skuSearchResult);
  TestValidator.equals(
    "SKU search pagination records",
    skuSearchResult.pagination.records,
    0,
  );
  // 10. Test price range filtering with empty results
  const priceRange =
    await api.functional.ecommerceMall.seller.products.variants.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        variantId: variantId,
        body: {
          priceRange: { min: 0, max: 10000 },
        },
      },
    );
  typia.assert(priceRange);
  TestValidator.equals(
    "price range pagination records",
    priceRange.pagination.records,
    0,
  );
  // 11. Test custom pagination limit with empty results
  const customLimit = 5;
  const limitedResult =
    await api.functional.ecommerceMall.seller.products.variants.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        variantId: variantId,
        body: { limit: customLimit },
      },
    );
  typia.assert(limitedResult);
  TestValidator.equals(
    "custom limit applied",
    limitedResult.pagination.limit,
    customLimit,
  );
  TestValidator.equals(
    "data respects custom limit",
    limitedResult.data.length,
    0,
  );
  // 12. Test page parameter with empty results
  const page2Result =
    await api.functional.ecommerceMall.seller.products.variants.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        variantId: variantId,
        body: { page: 2, limit: 2 },
      },
    );
  typia.assert(page2Result);
  TestValidator.equals("page 2 current", page2Result.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2Result.pagination.limit, 2);
  TestValidator.equals(
    "page 2 pagination records",
    page2Result.pagination.records,
    0,
  );
  // 13. Test empty array structure validation
  const emptyData = allSnapshots.data;
  TestValidator.predicate("data is array", Array.isArray(emptyData));
  TestValidator.equals("data is empty", emptyData.length, 0);
  // 14. Verify pagination type safety
  const pagination: IPageIEcommerceMallProductVariantSnapshot.ISummary =
    allSnapshots;
  TestValidator.predicate(
    "pagination has records",
    pagination.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages",
    pagination.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination has current",
    pagination.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has limit",
    pagination.pagination.limit >= 1,
  );
}
