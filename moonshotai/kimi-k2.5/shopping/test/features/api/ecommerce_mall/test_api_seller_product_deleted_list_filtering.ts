import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
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
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";

/**
 * Test filtering deleted products for an authenticated seller.
 * Validates filtering by product name with partial text matching and pagination.
 */
export async function test_api_seller_product_deleted_list_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Create multiple products with different names
  const product1 = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        ...prepare_random_ecommerce_mall_product(),
        name: "Premium Wireless Headphones",
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product1);
  const product2 = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        ...prepare_random_ecommerce_mall_product(),
        name: "Bluetooth Speaker Pro",
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product2);
  const product3 = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        ...prepare_random_ecommerce_mall_product(),
        name: "Wireless Charging Pad",
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product3);
  const product4 = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        ...prepare_random_ecommerce_mall_product(),
        name: "USB Cable Pack",
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product4);
  // 3. Delete all products to create deleted product data
  await api.functional.ecommerceMall.seller.products.erase(sellerConnection, {
    productId: product1.id,
  });
  await api.functional.ecommerceMall.seller.products.erase(sellerConnection, {
    productId: product2.id,
  });
  await api.functional.ecommerceMall.seller.products.erase(sellerConnection, {
    productId: product3.id,
  });
  await api.functional.ecommerceMall.seller.products.erase(sellerConnection, {
    productId: product4.id,
  });
  // 4. Test retrieving all deleted products without filters
  const allDeletedResult =
    await api.functional.ecommerceMall.seller.products.deleted.index(
      sellerConnection,
      {
        body: {} satisfies IEcommerceMallProduct.IRequest,
      },
    );
  typia.assert(allDeletedResult);
  TestValidator.predicate(
    "returns all deleted products",
    allDeletedResult.data.length >= 4,
  );
  // 5. Test filtering by product name (partial match)
  const nameFilterResult =
    await api.functional.ecommerceMall.seller.products.deleted.index(
      sellerConnection,
      {
        body: {
          name: "Wireless",
        } satisfies IEcommerceMallProduct.IRequest,
      },
    );
  typia.assert(nameFilterResult);
  // Verify only products with "Wireless" in name are returned
  TestValidator.predicate(
    "name filter returns only matching products",
    nameFilterResult.data.every((p) =>
      p.name.toLowerCase().includes("wireless"),
    ),
  );
  TestValidator.predicate(
    "name filter returns correct products",
    nameFilterResult.data.length === 2 &&
      nameFilterResult.data.some((p) => p.id === product1.id) &&
      nameFilterResult.data.some((p) => p.id === product3.id),
  );
  // 6. Test filtering by different name pattern
  const bluetoothFilterResult =
    await api.functional.ecommerceMall.seller.products.deleted.index(
      sellerConnection,
      {
        body: {
          name: "Bluetooth",
        } satisfies IEcommerceMallProduct.IRequest,
      },
    );
  typia.assert(bluetoothFilterResult);
  TestValidator.equals(
    "Bluetooth filter returns one product",
    bluetoothFilterResult.data.length,
    1,
  );
  TestValidator.equals(
    "Bluetooth filter returns correct product",
    bluetoothFilterResult.data[0].id,
    product2.id,
  );
  // 7. Test pagination - page 1 with limit 2
  const page1Result =
    await api.functional.ecommerceMall.seller.products.deleted.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 2,
        } satisfies IEcommerceMallProduct.IRequest,
      },
    );
  typia.assert(page1Result);
  // Verify pagination metadata
  TestValidator.equals(
    "page 1 current page",
    page1Result.pagination.current,
    1,
  );
  TestValidator.equals("page 1 limit", page1Result.pagination.limit, 2);
  TestValidator.predicate(
    "page 1 has correct record count",
    page1Result.pagination.records >= 4,
  );
  TestValidator.predicate(
    "page 1 has correct page count",
    page1Result.pagination.pages >= 2,
  );
  TestValidator.equals("page 1 data length", page1Result.data.length, 2);
  // 8. Test pagination - page 2
  const page2Result =
    await api.functional.ecommerceMall.seller.products.deleted.index(
      sellerConnection,
      {
        body: {
          page: 2,
          limit: 2,
        } satisfies IEcommerceMallProduct.IRequest,
      },
    );
  typia.assert(page2Result);
  TestValidator.equals(
    "page 2 current page",
    page2Result.pagination.current,
    2,
  );
  TestValidator.predicate(
    "page 2 has remaining items",
    page2Result.data.length >= 2,
  );
  // Verify no overlap between pages
  TestValidator.predicate(
    "page 1 and page 2 have no overlapping items",
    !page1Result.data.some((p1) =>
      page2Result.data.some((p2) => p1.id === p2.id),
    ),
  );
  // 9. Test combined filters (name + pagination)
  const combinedFilterResult =
    await api.functional.ecommerceMall.seller.products.deleted.index(
      sellerConnection,
      {
        body: {
          name: "USB",
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallProduct.IRequest,
      },
    );
  typia.assert(combinedFilterResult);
  TestValidator.equals(
    "combined filter returns only USB product",
    combinedFilterResult.data.length,
    1,
  );
  TestValidator.equals(
    "combined filter returns correct product",
    combinedFilterResult.data[0].id,
    product4.id,
  );
  TestValidator.equals(
    "combined filter pagination shows correct total",
    combinedFilterResult.pagination.records,
    1,
  );
  TestValidator.equals(
    "combined filter pagination shows correct pages",
    combinedFilterResult.pagination.pages,
    1,
  );
  // 10. Verify seller isolation - create another seller and ensure they can't see these products
  const otherSellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(otherSellerConnection, {});
  const otherSellerResult =
    await api.functional.ecommerceMall.seller.products.deleted.index(
      otherSellerConnection,
      {
        body: {} satisfies IEcommerceMallProduct.IRequest,
      },
    );
  typia.assert(otherSellerResult);
  // Other seller should not see the first seller's deleted products
  TestValidator.predicate(
    "other seller cannot see first seller's products",
    !otherSellerResult.data.some(
      (p) =>
        p.id === product1.id ||
        p.id === product2.id ||
        p.id === product3.id ||
        p.id === product4.id,
    ),
  );
  // 11. Test non-matching name filter returns empty results
  const emptyFilterResult =
    await api.functional.ecommerceMall.seller.products.deleted.index(
      sellerConnection,
      {
        body: {
          name: "NonExistentProductXYZ",
        } satisfies IEcommerceMallProduct.IRequest,
      },
    );
  typia.assert(emptyFilterResult);
  TestValidator.equals(
    "non-matching filter returns empty data",
    emptyFilterResult.data.length,
    0,
  );
  TestValidator.equals(
    "non-matching filter shows zero records",
    emptyFilterResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "non-matching filter shows zero pages",
    emptyFilterResult.pagination.pages,
    0,
  );
}
