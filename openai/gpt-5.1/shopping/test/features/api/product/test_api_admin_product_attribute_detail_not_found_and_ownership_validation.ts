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
 * Validate admin product attribute detail endpoint handles not-found and
 * ownership rules.
 *
 * Business goals:
 *
 * - Ensure that GET
 *   /shoppingMall/admin/products/{productId}/attributes/{productAttributeId}
 *   returns a valid attribute when the product and attribute match.
 * - Ensure that the same endpoint rejects attempts to fetch an attribute using a
 *   different productId than the one it belongs to (ownership validation).
 * - Ensure that requesting a completely non-existent attribute id fails without
 *   leaking any extra data.
 *
 * End-to-end steps:
 *
 * 1. Register seller A and create product A under seller A.
 * 2. Register an admin account and authenticate as admin.
 * 3. As admin, create a category and associate product A to that category.
 * 4. As admin, create an attribute for product A and verify that the detail
 *    endpoint returns the expected attribute when called with (productAId,
 *    attributeIdA).
 * 5. Register seller B and create product B under seller B.
 * 6. Optionally associate product B to any category (not required for logic but
 *    improves realism).
 * 7. As admin, attempt to fetch attributeIdA using productBId in the path and
 *    assert that the SDK call results in an error via TestValidator.error,
 *    representing a 404/ownership violation in the backend.
 * 8. Generate a random UUID that does not correspond to any attribute and call the
 *    detail endpoint with (productAId, nonexistentAttributeId), again using
 *    TestValidator.error to assert that an error is thrown.
 *
 * Constraints and rules:
 *
 * - Authentication is managed only through auth.seller.join/login and
 *   auth.admin.join/login; do not touch connection.headers manually.
 * - All request bodies must use `satisfies` with the correct DTO variant
 *   (ICreate/IRequest) and never use `as any` or intentionally wrong types.
 * - All non-void responses must be validated with typia.assert().
 * - Error tests focus only on the fact that an error is thrown, not on exact HTTP
 *   status codes or error payload contents.
 */
export async function test_api_admin_product_attribute_detail_not_found_and_ownership_validation(
  connection: api.IConnection,
) {
  // 1. Register seller A
  const sellerAJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://seller-a.example.com/join",
    referrer: "https://seller-a.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const sellerA: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerAJoinBody,
    });
  typia.assert(sellerA);

  // 1-2. Create product A as seller A (current connection is seller A due to join)
  const productABody = {
    code: RandomGenerator.alphaNumeric(8),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "Brand A",
    model_name: "Model-A1",
    status: "active",
    primary_image_uri: "https://cdn.example.com/product-a.jpg" as string &
      tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;
  const productA: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productABody,
    });
  typia.assert(productA);

  // 2. Register and authenticate admin
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;
  const adminJoin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminJoin);

  // Explicit login step (optional but shows login flow)
  const adminLoginBody = {
    email: adminJoin.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminLogin.ICreate;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(admin);

  // 3. Create a category and associate product A to it
  const categoryBody = {
    parent_id: null,
    slug: RandomGenerator.alphaNumeric(12),
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    description_en: RandomGenerator.paragraph({ sentences: 3 }),
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryBody,
    });
  typia.assert(category);

  const productACategoryBody = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;
  const productACategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: productA.id,
        body: productACategoryBody,
      },
    );
  typia.assert(productACategory);

  // 4. Create attribute for product A and verify detail retrieval
  const attributeABody = {
    name: RandomGenerator.alphabets(8) as string & tags.MinLength<1>,
    display_name: RandomGenerator.paragraph({ sentences: 1 }) as string &
      tags.MinLength<1>,
    data_type: "string" as string & tags.MinLength<1>,
    is_variant_dimension: true,
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductAttribute.ICreate;
  const attributeA: IShoppingMallProductAttribute =
    await api.functional.shoppingMall.admin.products.attributes.create(
      connection,
      {
        productId: productA.id,
        body: attributeABody,
      },
    );
  typia.assert(attributeA);

  const fetchedAttributeA: IShoppingMallProductAttribute =
    await api.functional.shoppingMall.admin.products.attributes.at(connection, {
      productId: productA.id as string & tags.Format<"uuid">,
      productAttributeId: attributeA.id,
    });
  typia.assert(fetchedAttributeA);
  TestValidator.equals(
    "attribute A detail retrieval should match created attribute id",
    fetchedAttributeA.id,
    attributeA.id,
  );
  TestValidator.equals(
    "attribute A should belong to product A",
    fetchedAttributeA.product.id,
    productA.id,
  );

  // 5. Register seller B and create product B
  const sellerBJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://seller-b.example.com/join",
    referrer: "https://seller-b.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const sellerB: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerBJoinBody,
    });
  typia.assert(sellerB);

  const productBBody = {
    code: RandomGenerator.alphaNumeric(8),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "Brand B",
    model_name: "Model-B1",
    status: "active",
    primary_image_uri: "https://cdn.example.com/product-b.jpg" as string &
      tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;
  const productB: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBBody,
    });
  typia.assert(productB);

  // Switch back to admin for admin-only operations
  const adminReLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminReLogin);

  // Optional: associate product B with the same category for realism
  const productBCategoryBody = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;
  const productBCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: productB.id,
        body: productBCategoryBody,
      },
    );
  typia.assert(productBCategory);

  // 7. Ownership validation: attempt to fetch attributeA via product B
  await TestValidator.error(
    "admin fetching attributeA with mismatched productBId should fail",
    async () => {
      await api.functional.shoppingMall.admin.products.attributes.at(
        connection,
        {
          productId: productB.id as string & tags.Format<"uuid">,
          productAttributeId: attributeA.id,
        },
      );
    },
  );

  // 8. Not-found validation: random non-existent attribute id under product A
  const nonexistentAttributeId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "admin fetching non-existent attribute id under product A should fail",
    async () => {
      await api.functional.shoppingMall.admin.products.attributes.at(
        connection,
        {
          productId: productA.id as string & tags.Format<"uuid">,
          productAttributeId: nonexistentAttributeId,
        },
      );
    },
  );
}
