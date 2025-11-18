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
import type { IShoppingMallProductLocalization } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductLocalization";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";

/**
 * Validate that admin product localization detail API returns an error when the
 * requested localization does not exist for the given product.
 *
 * Business context:
 *
 * - Admins manage product localizations for products created by sellers.
 * - The detail endpoint must not return "success with empty content" when the
 *   localization ID is invalid or belongs to another product; it should fail
 *   clearly so clients dont treat a phantom localization as real.
 *
 * Scenario steps:
 *
 * 1. Register an admin using /auth/admin/join so that we have an admin identity
 *    and token in the connection.
 * 2. Register a seller using /auth/seller/join and then (implicitly) act as that
 *    seller.
 * 3. As the seller, create a realistic product via /shoppingMall/seller/products
 *    using IShoppingMallProduct.ICreate and capture its id.
 * 4. Switch back to the admin actor using /auth/admin/login so that admin- only
 *    endpoints can be called.
 * 5. (Optional realism) As admin, create one category using
 *    /shoppingMall/admin/categories and link it to the product using
 *    /shoppingMall/admin/products/{productId}/categories. This ensures the
 *    product is in the catalog, but does not create any localization.
 * 6. Generate a random UUID for productLocalizationId that is not associated with
 *    any localization for this product. Do not call any localization creation
 *    endpoints so that no matching record exists.
 * 7. As admin, invoke
 *    api.functional.shoppingMall.admin.products.localizations.at(connection, {
 *    productId, productLocalizationId: nonExistingId }).
 * 8. Use TestValidator.error with an async callback to assert that the call
 *    results in an error; do not inspect HTTP status codes or error payloads.
 *
 * What this test validates:
 *
 * - The admin localization detail endpoint enforces existence of the
 *   `shopping_mall_product_localizations` record bound to the specified
 *   product.
 * - When the localization id is missing (no record, or belongs to a different
 *   product), the API rejects the request instead of returning a successful
 *   IShoppingMallProductLocalization.
 * - The error behavior works even when the surrounding product and catalog
 *   configuration are otherwise valid.
 */
export async function test_api_admin_product_localization_detail_not_found_for_missing_localization(
  connection: api.IConnection,
) {
  // 1. Admin join: create initial admin and obtain token
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.shoppingmall.local/join",
    referrer: "https://admin.shoppingmall.local/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;
  const adminJoined: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminJoined);

  // 2. Seller join: create seller actor
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://seller.shoppingmall.local/join",
    referrer: "https://seller.shoppingmall.local/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const sellerJoined: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerJoined);

  // 3. As seller, create a product
  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(12),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "AutoBE-Test-Brand",
    model_name: RandomGenerator.alphabets(6),
    status: "active",
    primary_image_uri:
      "https://cdn.shoppingmall.local/images/" +
      RandomGenerator.alphaNumeric(16) +
      ".jpg",
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 4. Switch back to admin via login
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.shoppingmall.local/login",
    referrer: "https://admin.shoppingmall.local/landing",
  } satisfies IShoppingMallAdminLogin.ICreate;
  const adminLoggedIn: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  // 5. Optional realism: create a category and link product to it
  const categoryCreateBody = {
    parent_id: null,
    slug: "autobe-test-" + RandomGenerator.alphaNumeric(8),
    name_en: "AutoBE Test Category",
    description_en: RandomGenerator.paragraph({ sentences: 4 }),
    status: "active",
    sort_order: 1,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateBody,
    });
  typia.assert(category);

  const categoryLinkBody = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;
  const productCategoryLink: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product.id,
        body: categoryLinkBody,
      },
    );
  typia.assert(productCategoryLink);

  // 6. Prepare a non-existing localization id (random UUID)
  const nonExistingLocalizationId = typia.random<
    string & tags.Format<"uuid">
  >();

  // 7 & 8. Expect an error when admin tries to fetch missing localization
  await TestValidator.error(
    "admin localization detail should error for non-existing localization id",
    async () => {
      await api.functional.shoppingMall.admin.products.localizations.at(
        connection,
        {
          productId: product.id as string & tags.Format<"uuid">,
          productLocalizationId: nonExistingLocalizationId,
        },
      );
    },
  );
}
