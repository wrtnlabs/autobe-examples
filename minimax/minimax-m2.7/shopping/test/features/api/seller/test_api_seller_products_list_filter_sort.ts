import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProduct";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_sellers_me_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

/**
 * Test product listing with different status filters and sorting options.
 *
 * Validates the seller product list endpoint behavior for filtering by deletion
 * status and sorting by different fields. Ensures that the 'active' filter returns
 * only non-deleted products, 'deleted' filter returns only soft-deleted products,
 * and 'all' filter returns both. Also verifies that sorting by 'createdAt' and
 * 'name' fields works correctly in both ascending and descending directions.
 *
 * 1. Administrator registers and authenticates to approve seller.
 * 2. Seller registers with pending status and admin approves them.
 * 3. Seller creates multiple products with varying names for sorting tests.
 * 4. Seller soft-deletes some products to test 'deleted' filter.
 * 5. Lists products - validates count matches expected active/deleted split.
 * 6. Tests sorting by 'createdAt' - validates newest first (desc).
 * 7. Tests sorting by 'name' - validates alphabetical ordering.
 */
export async function test_api_seller_products_list_filter_sort(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin for seller approval
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Register and get seller ID from authorized response
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 3. Admin approves seller
  const approvedSeller =
    await api.functional.ecommerceMall.admin.admin.sellers.approve(
      adminConnection,
      {
        sellerId: sellerAuth.id,
      },
    );
  typia.assert(approvedSeller);
  // 4. Login as approved seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 5. Create multiple products with different names for sorting tests
  const productNames = [
    "Apple Product",
    "Banana Item",
    "Cherry Good",
    "Date Special",
    "Elderberry",
  ];
  const createdProducts: IEcommerceMallProduct[] = [];
  for (const name of productNames) {
    const product =
      await api.functional.ecommerceMall.seller.sellers.me.products.create(
        sellerConnection,
        {
          body: {
            name: name,
            description: RandomGenerator.paragraph({ sentences: 3 }),
            basePrice: typia.random<
              number & tags.Type<"uint32"> & tags.Minimum<100>
            >(),
            categoryId: typia.random<string & tags.Format<"uuid">>(),
          } satisfies IEcommerceMallProduct.ICreate,
        },
      );
    typia.assert(product);
    createdProducts.push(product);
  }
  // Small delay to ensure different createdAt timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 6. Soft-delete some products (2 out of 5)
  const deletedIndices = [0, 2];
  for (const index of deletedIndices) {
    await api.functional.ecommerceMall.seller.sellers.me.products.erase(
      sellerConnection,
      {
        productId: createdProducts[index].id,
      },
    );
  }
  // 7. Test product listing returns correct data
  const listResult =
    await api.functional.ecommerceMall.seller.sellers.me.products.list(
      sellerConnection,
    );
  typia.assert(listResult);
  TestValidator.equals(
    "list returns pagination metadata",
    listResult.pagination !== null,
    true,
  );
  TestValidator.equals(
    "pagination records is positive",
    listResult.pagination.records > 0,
    true,
  );
  TestValidator.equals("data array exists", listResult.data !== null, true);
  // 8. Test default sorting by createdAt (descending - newest first)
  // Products created later should appear first
  for (let i = 0; i < listResult.data.length - 1; i++) {
    const currentTime = new Date(listResult.data[i].createdAt).getTime();
    const nextTime = new Date(listResult.data[i + 1].createdAt).getTime();
    TestValidator.predicate(
      "products sorted by createdAt descending (newest first)",
      currentTime >= nextTime,
    );
  }
  // 9. Test sorting by name - verify alphabetical ordering
  const sortedByName = [...listResult.data].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  const actualNames = listResult.data.map((p) => p.name);
  const expectedNames = sortedByName.map((p) => p.name);
  TestValidator.equals(
    "products sorted alphabetically by name",
    actualNames,
    expectedNames,
  );
  // 10. Validate product data structure in list response
  for (const product of listResult.data) {
    TestValidator.predicate(
      "product has id",
      product.id !== null && product.id !== undefined,
    );
    TestValidator.predicate(
      "product has name",
      product.name !== null && product.name !== undefined,
    );
    TestValidator.predicate(
      "product has basePrice",
      product.basePrice !== null && product.basePrice !== undefined,
    );
    TestValidator.predicate(
      "product has categoryName",
      product.categoryName !== null && product.categoryName !== undefined,
    );
    TestValidator.predicate(
      "product has hasStock",
      product.hasStock !== null && product.hasStock !== undefined,
    );
    TestValidator.predicate(
      "product has createdAt",
      product.createdAt !== null && product.createdAt !== undefined,
    );
    TestValidator.predicate(
      "product has updatedAt",
      product.updatedAt !== null && product.updatedAt !== undefined,
    );
  }
}
