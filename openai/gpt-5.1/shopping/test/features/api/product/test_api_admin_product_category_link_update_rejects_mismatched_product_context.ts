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
 * Validate that admin product-category link update enforces product context
 * consistency.
 *
 * Business goal: Ensure that the endpoint PUT
 * /shoppingMall/admin/products/{productId}/categories/{productCategoryLinkId}
 * does not allow updating a link row when the productId in the path does not
 * match the product that actually owns the link in
 * `shopping_mall_product_categories`.
 *
 * High-level scenario:
 *
 * 1. Create an admin (join) and keep its authenticated context.
 * 2. Create a seller (join) and keep its authenticated context for seller APIs.
 * 3. As seller, create two products: productA and productB.
 * 4. Switch to admin, create a category.
 * 5. As admin, create a product-category link for productA.
 * 6. As admin, attempt to update that link using productB as the productId path
 *    parameter, with a valid IShoppingMallProductCategory.IUpdate body.
 * 7. Assert that the update call fails (business/HTTP error), without asserting
 *    concrete status codes.
 *
 * This test focuses on the negative case (mismatched product context) while
 * still exercising all involved happy-path setup APIs.
 */
export async function test_api_admin_product_category_link_update_rejects_mismatched_product_context(
  connection: api.IConnection,
) {
  // 1. Admin registration (join) to obtain admin auth context.
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@admin.example.com`,
    password: RandomGenerator.alphabets(12) as string & tags.Format<"password">,
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminJoin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminJoin);

  // 2. Seller registration (join).
  const sellerJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@seller.example.com` as string &
      tags.Format<"email">,
    password: RandomGenerator.alphabets(12) as string & tags.Format<"password">,
    ip: null,
    href: "https://seller.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://seller.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerJoin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerJoin);

  // 3. Ensure seller login path also works (and sets seller auth header),
  //    though join already authenticated the connection.
  const sellerLoginBody = {
    email: sellerJoin.email,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://seller.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerLogin);

  // 4. As seller, create productA and productB via seller products.create.
  const baseProductStatus = "active";
  const productCodeA = `CODE-${RandomGenerator.alphaNumeric(8)}`;
  const productCodeB = `CODE-${RandomGenerator.alphaNumeric(8)}`;

  const productABody = {
    code: productCodeA,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "BrandA",
    model_name: "ModelA-1",
    status: baseProductStatus,
    primary_image_uri: "https://cdn.example.com/productA.jpg" as string &
      tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const productA: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productABody,
    });
  typia.assert<IShoppingMallProduct>(productA);

  const productBBody = {
    code: productCodeB,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "BrandB",
    model_name: "ModelB-1",
    status: baseProductStatus,
    primary_image_uri: "https://cdn.example.com/productB.jpg" as string &
      tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const productB: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBBody,
    });
  typia.assert<IShoppingMallProduct>(productB);

  // Basic sanity check that products are distinct.
  TestValidator.notEquals(
    "productA and productB must be different",
    productA.id,
    productB.id,
  );

  // 5. Switch back to admin context via admin login to ensure admin
  //    Authorization header is applied for subsequent admin endpoints.
  const adminLoginBody = {
    email: adminJoin.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminLogin);

  // 6. Create a category via admin categories.create.
  const categoryBody = {
    parent_id: null,
    slug: `cat-${RandomGenerator.alphaNumeric(6)}`,
    name_en: "Category for mismatch test",
    description_en: RandomGenerator.paragraph({ sentences: 4 }),
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryBody,
    });
  typia.assert<IShoppingMallCategory>(category);

  // 7. Create a product-category link for productA via admin products.categories.create.
  const linkCreateBody = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;

  const productALink: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: productA.id,
        body: linkCreateBody,
      },
    );
  typia.assert<IShoppingMallProductCategory>(productALink);

  // Sanity: link must refer to productA and our category.
  TestValidator.equals(
    "link belongs to productA",
    productALink.shopping_mall_product_id,
    productA.id,
  );
  TestValidator.equals(
    "link category matches created category",
    productALink.shopping_mall_category_id,
    category.id,
  );

  // 8. Attempt to update link under mismatched productB context.
  // Body is valid IShoppingMallProductCategory.IUpdate, but productId in path
  // uses productB.id instead of productA.id.
  const mismatchedUpdateBody = {
    is_primary: false,
  } satisfies IShoppingMallProductCategory.IUpdate;

  await TestValidator.error(
    "updating product-category link under mismatched productId must fail",
    async () => {
      await api.functional.shoppingMall.admin.products.categories.update(
        connection,
        {
          productId: productB.id as string & tags.Format<"uuid">,
          productCategoryLinkId: productALink.id as string &
            tags.Format<"uuid">,
          body: mismatchedUpdateBody,
        },
      );
    },
  );
}
