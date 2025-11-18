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
import type { IShoppingMallProductAttributeValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAttributeValue";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";

export async function test_api_product_attribute_value_update_ownership_enforcement(
  connection: api.IConnection,
) {
  // 1. Register Seller A (join) and keep credentials
  const sellerAEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerAPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const sellerAJoinBody = {
    email: sellerAEmail,
    password: sellerAPassword,
    href: "https://seller-a.example.com/join",
    referrer: "https://seller-a.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerAJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAAuthorized);

  // 2. As Seller A, create a product using seller products.create
  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(12),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "TestBrand",
    model_name: "Model-" + RandomGenerator.alphaNumeric(6),
    status: "active",
    primary_image_uri:
      "https://cdn.example.com/images/" +
      RandomGenerator.alphaNumeric(16) +
      ".jpg",
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const productA: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert<IShoppingMallProduct>(productA);

  // 3. Create an admin account and login for catalog configuration
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // Explicit admin login to ensure admin context (even though join already set token)
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
    ip: null,
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLoginAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminLoginAuthorized);

  // 3-1. Admin creates a category
  const categoryCreateBody = {
    parent_id: null,
    slug: "cat-" + RandomGenerator.alphaNumeric(8),
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    description_en: RandomGenerator.paragraph({ sentences: 5 }),
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateBody,
    });
  typia.assert<IShoppingMallCategory>(category);

  // 3-2. Admin links product A to category
  const productCategoryCreateBody = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;

  const productCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: productA.id,
        body: productCategoryCreateBody,
      },
    );
  typia.assert<IShoppingMallProductCategory>(productCategory);

  // 3-3. Admin creates a product attribute for product A
  const attributeCreateBody = {
    name: "attr-" + RandomGenerator.alphaNumeric(6),
    display_name: "Attribute " + RandomGenerator.alphaNumeric(4),
    data_type: "string",
    is_variant_dimension: true,
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductAttribute.ICreate;

  const productAttribute: IShoppingMallProductAttribute =
    await api.functional.shoppingMall.admin.products.attributes.create(
      connection,
      {
        productId: productA.id,
        body: attributeCreateBody,
      },
    );
  typia.assert<IShoppingMallProductAttribute>(productAttribute);

  // 4. Switch back to Seller A and create an attribute value
  const sellerALoginBody = {
    email: sellerAEmail,
    password: sellerAPassword,
    href: "https://seller-a.example.com/login",
    referrer: "https://seller-a.example.com/landing",
    ip: null,
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerALogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerALoginBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerALogin);

  const attributeValueCreateBody = {
    value: "RED",
    display_value: "Red",
    display_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallProductAttributeValue.ICreate;

  const attributeValue: IShoppingMallProductAttributeValue =
    await api.functional.shoppingMall.seller.products.attributes.values.create(
      connection,
      {
        productId: productA.id,
        productAttributeId: productAttribute.id,
        body: attributeValueCreateBody,
      },
    );
  typia.assert<IShoppingMallProductAttributeValue>(attributeValue);

  // 5. Register Seller B
  const sellerBEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerBPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const sellerBJoinBody = {
    email: sellerBEmail,
    password: sellerBPassword,
    href: "https://seller-b.example.com/join",
    referrer: "https://seller-b.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerBAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerBJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerBAuthorized);

  // 6. Login as Seller B
  const sellerBLoginBody = {
    email: sellerBEmail,
    password: sellerBPassword,
    href: "https://seller-b.example.com/login",
    referrer: "https://seller-b.example.com/landing",
    ip: null,
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerBLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerBLoginBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerBLogin);

  // Prepare a valid update payload for Seller B's unauthorized attempt
  const unauthorizedUpdateBody = {
    display_value: "Green",
    display_order: 2 as number & tags.Type<"int32">,
  } satisfies IShoppingMallProductAttributeValue.IUpdate;

  // 7. As Seller B, attempt to update Seller A's attribute value and
  //    assert that an error is thrown (authorization enforcement)
  await TestValidator.error(
    "seller B cannot update attribute value of Seller A's product",
    async () => {
      await api.functional.shoppingMall.seller.products.attributes.values.update(
        connection,
        {
          productId: productA.id,
          productAttributeId: productAttribute.id,
          productAttributeValueId: attributeValue.id,
          body: unauthorizedUpdateBody,
        },
      );
    },
  );

  // 8. Switch back to Seller A and perform a legitimate update to ensure
  //    that only Seller A's update is applied
  const sellerALoginAgainBody = {
    email: sellerAEmail,
    password: sellerAPassword,
    href: "https://seller-a.example.com/login",
    referrer: "https://seller-a.example.com/landing",
    ip: null,
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerALoginAgain: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerALoginAgainBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerALoginAgain);

  const authorizedUpdateBody = {
    display_value: "Blue",
    display_order: 3 as number & tags.Type<"int32">,
  } satisfies IShoppingMallProductAttributeValue.IUpdate;

  const updatedBySellerA: IShoppingMallProductAttributeValue =
    await api.functional.shoppingMall.seller.products.attributes.values.update(
      connection,
      {
        productId: productA.id,
        productAttributeId: productAttribute.id,
        productAttributeValueId: attributeValue.id,
        body: authorizedUpdateBody,
      },
    );
  typia.assert<IShoppingMallProductAttributeValue>(updatedBySellerA);

  // Business-level checks: ensure the final state reflects only Seller A's
  // authorized update payload values, not Seller B's attempt.
  TestValidator.equals(
    "final attribute value display_value must match Seller A's update",
    updatedBySellerA.display_value,
    authorizedUpdateBody.display_value,
  );
  TestValidator.equals(
    "final attribute value display_order must match Seller A's update",
    updatedBySellerA.display_order,
    authorizedUpdateBody.display_order,
  );
}
