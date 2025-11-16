import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductsCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductsCategory";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductsCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductsCategory";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validates that admins can list all product category assignments.
 *
 * This test verifies that, after a product is created by a seller and assigned
 * a category, an admin can list category mappings for that product via the
 * admin category listing endpoint. Multiple actor authentication is validated
 * (admin/seller), business entity creation flows are covered, and cross-actor
 * catalog visibility is asserted.
 *
 * 1. Register and authenticate a new admin
 * 2. Register and authenticate a new seller
 * 3. Seller creates a product
 * 4. Seller assigns a category to the product
 * 5. Login as admin again (actor switch)
 * 6. Admin lists the product's category assignments
 * 7. Assert listing contains the assigned category
 */
export async function test_api_admin_product_category_assignment_listing(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(10);
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: RandomGenerator.name(1),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Register and authenticate a new seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(12);
  const href = `https://example.com/${RandomGenerator.alphaNumeric(8)}`;
  const referrer = `https://example.com/${RandomGenerator.alphaNumeric(8)}`;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        business_name: RandomGenerator.name(2),
        registration_number: RandomGenerator.alphaNumeric(10),
        business_phone: RandomGenerator.mobile(),
        href,
        referrer,
        ip: null,
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // 3. Seller creates a product
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.products.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        default_price: Math.floor(Math.random() * 50000) + 1000,
        business_status: "published",
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);

  // 4. Seller assigns a category to the product
  // Because category IDs are not directly creatable by this test, simulate a random UUID (see business scenario)
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const mapping: IShoppingMallProductsCategory =
    await api.functional.shoppingMall.seller.products.categories.create(
      connection,
      {
        productId: product.id,
        body: {
          shopping_mall_category_id: categoryId,
        } satisfies IShoppingMallProductsCategory.ICreate,
      },
    );
  typia.assert(mapping);

  // 5. Login as admin (actor switch)
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdmin.ILogin,
  });

  // 6. Admin lists the product's category assignments
  const list: IPageIShoppingMallProductsCategory.ISummary =
    await api.functional.shoppingMall.admin.products.categories.index(
      connection,
      {
        productId: product.id,
        body: {
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        },
      },
    );
  typia.assert(list);

  // 7. Assert listing contains the assigned category mapping
  TestValidator.predicate(
    "admin can see category mapping for seller's product",
    list.data.some((item) => item.id === mapping.id),
  );
}
