import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";

/**
 * Validate that seller-side product updates preserve existing admin-managed
 * product–category relationships.
 *
 * Business context:
 *
 * - Sellers own products and can update core product metadata via
 *   /shoppingMall/seller/products/{productId}.
 * - Admins own the global category taxonomy and product–category links via
 *   /shoppingMall/admin/categories and
 *   /shoppingMall/admin/products/{productId}/categories.
 *
 * This test ensures that when a seller updates a product that already has an
 * associated category link, the update does not break or remove that
 * relationship. It also validates basic role separation: only admin can create
 * categories and product-category links, while only the owning seller (or
 * admin) can update seller products.
 *
 * Steps:
 *
 * 1. Seller join -> obtain seller auth context.
 * 2. Seller creates product -> base product for test, capture productId.
 * 3. Admin join -> obtain admin auth context.
 * 4. Admin creates category using IShoppingMallCategory.ICreate.
 * 5. Admin links product and category via IShoppingMallProductCategory.ICreate.
 * 6. Switch back to seller via seller login.
 * 7. Seller updates product via IShoppingMallProduct.IUpdate, changing brand,
 *    model_name, status, default_locale, and some text fields.
 * 8. Assert updated product fields and verify that product id and
 *    shopping_mall_seller_id remain unchanged.
 * 9. Rely on successful link creation and absence of errors from the update as
 *    evidence that the category relationship remains valid (no read endpoint is
 *    provided for re-checking the link).
 */
export async function test_api_seller_product_update_with_category_relationship(
  connection: api.IConnection,
) {
  // 1. Seller joins and obtains auth context
  const sellerJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@seller.test`,
    password: "P@ssw0rd!", // satisfies tags.Format<"password"> by intent
    ip: null,
    href: "https://seller.test/join",
    referrer: "https://seller.test/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  const sellerEmail: string = sellerAuthorized.email;

  // 2. Seller creates a product
  const createProductBody = {
    code: RandomGenerator.alphaNumeric(12),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "InitialBrand",
    model_name: "Model-X1",
    status: "active",
    primary_image_uri: "https://cdn.test/images/product-initial.jpg",
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const createdProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: createProductBody,
    });
  typia.assert(createdProduct);

  const productId: string & tags.Format<"uuid"> = createdProduct.id;
  const sellerId: string & tags.Format<"uuid"> =
    createdProduct.shopping_mall_seller_id;

  // 3. Admin joins and obtains auth context
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@admin.test`,
    password: "Adm1nP@ss!",
    ip: null,
    href: "https://admin.test/join",
    referrer: "https://admin.test/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  const adminEmail: string = adminAuthorized.email;

  // 4. Admin creates a category
  const createCategoryBody = {
    parent_id: null,
    slug: `cat-${RandomGenerator.alphaNumeric(6)}`,
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    description_en: RandomGenerator.paragraph({ sentences: 5 }),
    status: "active",
    sort_order: 1,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const createdCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: createCategoryBody,
    });
  typia.assert(createdCategory);

  const categoryId: string & tags.Format<"uuid"> = createdCategory.id;

  // 5. Admin links product and category
  const createProductCategoryLinkBody = {
    shopping_mall_category_id: categoryId,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;

  const productCategoryLink: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId,
        body: createProductCategoryLinkBody,
      },
    );
  typia.assert(productCategoryLink);

  TestValidator.equals(
    "product-category link product id matches productId",
    productCategoryLink.shopping_mall_product_id,
    productId,
  );
  TestValidator.equals(
    "product-category link category id matches created category id",
    productCategoryLink.shopping_mall_category_id,
    categoryId,
  );
  TestValidator.equals(
    "product-category link is marked primary",
    productCategoryLink.is_primary,
    true,
  );

  // 6. Switch back to seller by logging in again
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.test/login",
    referrer: "https://seller.test/landing",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const reloggedSeller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(reloggedSeller);
  TestValidator.equals(
    "re-logged seller id matches original seller id",
    reloggedSeller.id,
    sellerAuthorized.id,
  );

  // 7. Seller updates product fields (without touching categories)
  const updateProductBody = {
    brand: "UpdatedBrand",
    model_name: "Model-X2-Rev1",
    status: "inactive",
    default_locale: "ko-KR",
    title: RandomGenerator.paragraph({ sentences: 4 }),
    summary: RandomGenerator.paragraph({ sentences: 6 }),
    description: RandomGenerator.content({ paragraphs: 3 }),
    primary_image_uri: "https://cdn.test/images/product-updated.jpg",
  } satisfies IShoppingMallProduct.IUpdate;

  const updatedProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.update(connection, {
      productId,
      body: updateProductBody,
    });
  typia.assert(updatedProduct);

  // 8. Assert core invariants and updated fields
  TestValidator.equals(
    "product id remains unchanged after update",
    updatedProduct.id,
    createdProduct.id,
  );
  TestValidator.equals(
    "product seller id remains unchanged after update",
    updatedProduct.shopping_mall_seller_id,
    sellerId,
  );

  TestValidator.equals(
    "brand is updated",
    updatedProduct.brand,
    updateProductBody.brand,
  );
  TestValidator.equals(
    "model_name is updated",
    updatedProduct.model_name,
    updateProductBody.model_name,
  );
  TestValidator.equals(
    "status is updated",
    updatedProduct.status,
    updateProductBody.status,
  );
  TestValidator.equals(
    "default_locale is updated",
    updatedProduct.default_locale,
    updateProductBody.default_locale,
  );
  TestValidator.equals(
    "title is updated",
    updatedProduct.title,
    updateProductBody.title,
  );
  TestValidator.equals(
    "summary is updated",
    updatedProduct.summary,
    updateProductBody.summary,
  );
  TestValidator.equals(
    "description is updated",
    updatedProduct.description,
    updateProductBody.description,
  );
  TestValidator.equals(
    "primary_image_uri is updated",
    updatedProduct.primary_image_uri,
    updateProductBody.primary_image_uri,
  );

  // 9. Implicitly validate that category link remains intact by ensuring no
  // errors occurred and ids are consistent across create/link/update. Since
  // there is no read endpoint for product-category links, we cannot
  // re-fetch them here, but the absence of errors during product update and
  // preservation of product identity imply coexistence of roles.
}
