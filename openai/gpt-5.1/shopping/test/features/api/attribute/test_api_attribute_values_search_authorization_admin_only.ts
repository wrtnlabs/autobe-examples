import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductAttributeValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductAttributeValue";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAttribute";
import type { IShoppingMallProductAttributeValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAttributeValue";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";

/**
 * Verify that only admin actors can search product attribute values using the
 * admin-side search API, while sellers are forbidden even for their own
 * products.
 *
 * Business flow:
 *
 * 1. A seller self-registers and logs in.
 * 2. An admin self-registers (implicitly logged in).
 * 3. The seller creates a product.
 * 4. The admin creates a category and links it to the product.
 * 5. The admin defines a product attribute for that product.
 * 6. The seller creates attribute values for that attribute.
 * 7. The seller attempts to call the admin attribute value search API and must
 *    receive an authorization error.
 * 8. The admin calls the same search API and successfully retrieves a page of
 *    attribute values including those created by the seller.
 */
export async function test_api_attribute_values_search_authorization_admin_only(
  connection: api.IConnection,
) {
  // 1. Seller joins
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerJoinRequest = {
    email: sellerEmail,
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://frontend.example.com/seller/join" as string &
      tags.Format<"uri">,
    referrer: "https://frontend.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerJoinOutput: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinRequest,
    });
  typia.assert(sellerJoinOutput);

  // 2. Admin joins
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminJoinRequest = {
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(16) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://frontend.example.com/admin/join" as string &
      tags.Format<"uri">,
    referrer: "https://frontend.example.com/admin" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminJoinOutput: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinRequest,
    });
  typia.assert(adminJoinOutput);

  // 3. Switch to seller context explicitly via login (so we can later re-login)
  const sellerLoginRequest = {
    email: sellerEmail,
    password: sellerJoinRequest.password,
    ip: null,
    href: "https://frontend.example.com/seller/login" as string &
      tags.Format<"uri">,
    referrer: "https://frontend.example.com" as string & tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLoginOutput: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginRequest,
    });
  typia.assert(sellerLoginOutput);

  // 4. Seller creates a product
  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(8),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "TestBrand",
    model_name: "Model-X",
    status: "active",
    primary_image_uri:
      "https://cdn.example.com/images/product-primary.jpg" as string &
        tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 5. Switch to admin context before admin-only operations
  const adminLoginRequest = {
    email: adminEmail,
    password: adminJoinRequest.password,
    ip: null,
    href: "https://frontend.example.com/admin/login" as string &
      tags.Format<"uri">,
    referrer: "https://frontend.example.com/admin" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLoginOutput: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginRequest,
    });
  typia.assert(adminLoginOutput);

  // 6. Admin creates a category
  const categoryCreateBody = {
    parent_id: null,
    slug: `cat-${RandomGenerator.alphaNumeric(6)}`,
    name_en: "Test Category",
    description_en: "Category for attribute search auth test",
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateBody,
    });
  typia.assert(category);

  // 7. Admin links product to category
  const productCategoryCreateBody = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;

  const productCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product.id,
        body: productCategoryCreateBody,
      },
    );
  typia.assert(productCategory);

  // 8. Admin creates a product attribute for the product
  const attributeCreateBody = {
    name: "color" as string & tags.MinLength<1>,
    display_name: "Color" as string & tags.MinLength<1>,
    data_type: "string" as string & tags.MinLength<1>,
    is_variant_dimension: true,
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductAttribute.ICreate;

  const attribute: IShoppingMallProductAttribute =
    await api.functional.shoppingMall.admin.products.attributes.create(
      connection,
      {
        productId: product.id as string & tags.Format<"uuid">,
        body: attributeCreateBody,
      },
    );
  typia.assert(attribute);

  // 9. Switch back to seller context to create attribute values
  const sellerLoginAgain: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginRequest,
    });
  typia.assert(sellerLoginAgain);

  // 10. Seller creates multiple attribute values for this attribute
  const values: IShoppingMallProductAttributeValue[] = [];

  const valuePayloads: IShoppingMallProductAttributeValue.ICreate[] = [
    {
      value: "RED",
      display_value: "Red",
      display_order: 1 as number & tags.Type<"int32">,
    },
    {
      value: "BLUE",
      display_value: "Blue",
      display_order: 2 as number & tags.Type<"int32">,
    },
  ];

  for (const payload of valuePayloads) {
    const created: IShoppingMallProductAttributeValue =
      await api.functional.shoppingMall.seller.products.attributes.values.create(
        connection,
        {
          productId: product.id as string & tags.Format<"uuid">,
          productAttributeId: attribute.id as string & tags.Format<"uuid">,
          body: payload,
        },
      );
    typia.assert(created);
    values.push(created);
  }

  TestValidator.predicate(
    "at least one attribute value created",
    values.length > 0,
  );

  // 11. While authenticated as seller, attempt admin search and expect error
  const sellerSearchRequest = {
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
  } satisfies IShoppingMallProductAttributeValue.IRequest;

  await TestValidator.error(
    "seller cannot access admin attribute values search API",
    async () => {
      await api.functional.shoppingMall.admin.products.attributes.values.index(
        connection,
        {
          productId: product.id as string & tags.Format<"uuid">,
          productAttributeId: attribute.id as string & tags.Format<"uuid">,
          body: sellerSearchRequest,
        },
      );
    },
  );

  // 12. Switch back to admin context and perform successful search
  const adminLoginAgain: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginRequest,
    });
  typia.assert(adminLoginAgain);

  const adminSearchRequest = {
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
  } satisfies IShoppingMallProductAttributeValue.IRequest;

  const page: IPageIShoppingMallProductAttributeValue.ISummary =
    await api.functional.shoppingMall.admin.products.attributes.values.index(
      connection,
      {
        productId: product.id as string & tags.Format<"uuid">,
        productAttributeId: attribute.id as string & tags.Format<"uuid">,
        body: adminSearchRequest,
      },
    );
  typia.assert(page);

  // Validate pagination and presence of created values
  TestValidator.predicate(
    "admin search returns at least one attribute value",
    page.data.length > 0,
  );

  const createdIds = values.map((v) => v.id);
  const foundIds = page.data.map((s) => s.id);

  for (const id of createdIds) {
    TestValidator.predicate(
      `admin search includes created attribute value ${id}`,
      foundIds.includes(id),
    );
  }
}
