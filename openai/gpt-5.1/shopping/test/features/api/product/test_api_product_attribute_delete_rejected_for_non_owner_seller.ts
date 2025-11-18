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
import type { IShoppingMallProductAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAttribute";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";

/**
 * Verify that a seller cannot delete another seller’s product attribute.
 *
 * Business goal
 *
 * - Attribute definitions for a product must only be mutable by the owning seller
 *   (or admin), and cross-seller tampering via seller APIs must be rejected.
 *
 * High level flow
 *
 * 1. Create Seller A via /auth/seller/join and keep Seller A’s email for later
 *    logins.
 * 2. Create Seller B via /auth/seller/join (different email).
 * 3. Join an admin via /auth/admin/join and keep admin email for later login if
 *    needed.
 * 4. Authenticate as Seller A (explicit login) and create Product A via
 *    /shoppingMall/seller/products using IShoppingMallProduct.ICreate.
 * 5. Authenticate as admin and create a catalog category via
 *    /shoppingMall/admin/categories using IShoppingMallCategory.ICreate.
 * 6. As admin, create a product-category link for Product A via
 *    /shoppingMall/admin/products/{productId}/categories using
 *    IShoppingMallProductCategory.ICreate.
 * 7. As admin, create an attribute for Product A via
 *    /shoppingMall/admin/products/{productId}/attributes using
 *    IShoppingMallProductAttribute.ICreate, capturing the returned attribute
 *    id.
 * 8. Switch authentication context to Seller B via /auth/seller/login using Seller
 *    B’s email and password.
 * 9. As Seller B, call DELETE
 *    /shoppingMall/seller/products/{productId}/attributes/{productAttributeId}
 *    using api.functional.shoppingMall.seller.products.attributes.erase with
 *    Product A’s id and the attribute id created in step 7.
 * 10. Expect this call to fail due to authorization – use TestValidator.error with
 *     an async closure that awaits the erase call. Do not assert specific HTTP
 *     status codes; only check that an error is thrown.
 * 11. Optionally assert that the product’s seller summary (when present) does not
 *     match Seller B, reinforcing that we are indeed acting as a different
 *     seller.
 * 12. We cannot re-read the attribute with current APIs, so we rely on the
 *     behavioral guarantee that the unauthorized delete attempt failed.
 */
export async function test_api_product_attribute_delete_rejected_for_non_owner_seller(
  connection: api.IConnection,
) {
  // 1. Register Seller A (join)
  const sellerAEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerAPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();
  const sellerAJoinRequest = {
    email: sellerAEmail,
    password: sellerAPassword,
    ip: null,
    href: "https://seller-a.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://landing.example.com/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const sellerA: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerAJoinRequest,
    });
  typia.assert(sellerA);

  // 2. Register Seller B (join)
  const sellerBEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerBPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();
  const sellerBJoinRequest = {
    email: sellerBEmail,
    password: sellerBPassword,
    ip: null,
    href: "https://seller-b.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://landing.example.com/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const sellerB: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerBJoinRequest,
    });
  typia.assert(sellerB);

  // 3. Register Admin via /auth/admin/join
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();
  const adminJoinRequest = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://landing.example.com/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;
  const adminJoin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinRequest,
    });
  typia.assert(adminJoin);

  // 4. Ensure we are authenticated as Seller A when creating Product A.
  const sellerALoginRequest = {
    email: sellerAEmail,
    password: sellerAPassword,
    ip: null,
    href: "https://seller-a.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://landing.example.com/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthLogin.IRequest;
  const sellerALogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerALoginRequest,
    });
  typia.assert(sellerALogin);

  // 5. Create Product A under Seller A
  const productCreate = {
    code: RandomGenerator.alphaNumeric(8),
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    summary: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 8,
    }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 8,
    }),
    brand: "AutoBE-Test-Brand",
    model_name: "Model-" + RandomGenerator.alphaNumeric(4),
    status: "active",
    primary_image_uri: typia.random<string & tags.Format<"uri">>(),
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;
  const productA: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreate,
    });
  typia.assert(productA);

  // 6. Switch to admin context (login) to manage taxonomy and attributes
  const adminLoginRequest = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://landing.example.com/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminLogin.ICreate;
  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginRequest,
    });
  typia.assert(adminLogin);

  // 7. Create a category
  const categoryCreate = {
    parent_id: null,
    slug: "test-category-" + RandomGenerator.alphaNumeric(6),
    name_en: "Test Category " + RandomGenerator.alphabets(4),
    description_en: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 3,
      wordMax: 8,
    }),
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreate,
    });
  typia.assert(category);

  // 8. Link Product A to the category
  const productCategoryCreate = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;
  const productCategoryLink: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: productA.id,
        body: productCategoryCreate,
      },
    );
  typia.assert(productCategoryLink);

  // 9. Create an attribute for Product A as admin
  const attributeCreate = {
    name: ("color_" + RandomGenerator.alphabets(5)) as string &
      tags.MinLength<1>,
    display_name: "Color" as string & tags.MinLength<1>,
    data_type: "string" as string & tags.MinLength<1>,
    is_variant_dimension: true,
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductAttribute.ICreate;
  const attribute: IShoppingMallProductAttribute =
    await api.functional.shoppingMall.admin.products.attributes.create(
      connection,
      {
        productId: productA.id,
        body: attributeCreate,
      },
    );
  typia.assert(attribute);

  // 10. Switch authentication to Seller B
  const sellerBLoginRequest = {
    email: sellerBEmail,
    password: sellerBPassword,
    ip: null,
    href: "https://seller-b.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://landing.example.com/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthLogin.IRequest;
  const sellerBLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerBLoginRequest,
    });
  typia.assert(sellerBLogin);

  // Sanity check: product ownership should be Seller A, not Seller B (when seller summary exists)
  if (productA.seller !== undefined) {
    TestValidator.notEquals(
      "product owner seller id must differ from Seller B id",
      productA.seller.id,
      sellerBLogin.id,
    );
  }

  // 11. Attempt to delete Seller A's attribute as Seller B and expect failure
  await TestValidator.error(
    "non-owner seller cannot delete another seller's attribute",
    async () => {
      await api.functional.shoppingMall.seller.products.attributes.erase(
        connection,
        {
          productId: productA.id,
          productAttributeId: attribute.id,
        },
      );
    },
  );

  // We cannot re-read the attribute with current APIs, so we rely on the
  // behavioral guarantee that the unauthorized delete attempt failed.
}
