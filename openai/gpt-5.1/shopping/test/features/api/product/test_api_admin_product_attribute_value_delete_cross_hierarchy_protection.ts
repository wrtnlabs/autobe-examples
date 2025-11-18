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

export async function test_api_admin_product_attribute_value_delete_cross_hierarchy_protection(
  connection: api.IConnection,
) {
  // 1. Seller join -> obtain seller context
  const sellerJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@seller.example.com`,
    password: "Password!123" as string & tags.Format<"password">,
    ip: null,
    href: "https://seller.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://seller.example.com/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  const sellerEmail = sellerAuthorized.email;
  const sellerPassword = sellerJoinBody.password;

  // 2. Admin join -> obtain admin context
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@admin.example.com`,
    password: "AdminPass!123" as string & tags.Format<"password">,
    ip: null,
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  const adminEmail = adminAuthorized.email;
  const adminPassword = adminJoinBody.password;

  // 3. As admin, create a category
  const categoryBody = {
    parent_id: null,
    slug: RandomGenerator.alphabets(8),
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    description_en: RandomGenerator.paragraph({ sentences: 4 }),
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryBody,
    });
  typia.assert(category);

  // 4. Switch to seller and create Product A and Product B
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      ip: null,
      href: "https://seller.example.com/login" as string & tags.Format<"uri">,
      referrer: "https://seller.example.com/" as string & tags.Format<"uri">,
    } satisfies IShoppingMallSellerAuthLogin.IRequest,
  });

  const baseProductBody = () =>
    ({
      code: RandomGenerator.alphaNumeric(10),
      title: RandomGenerator.paragraph({ sentences: 2 }),
      summary: RandomGenerator.paragraph({ sentences: 3 }),
      description: RandomGenerator.content({ paragraphs: 2 }),
      brand: RandomGenerator.paragraph({ sentences: 1 }),
      model_name: RandomGenerator.paragraph({ sentences: 1 }),
      status: "active",
      primary_image_uri: "https://cdn.example.com/image.jpg" as string &
        tags.Format<"uri">,
      default_locale: "en-US",
    }) satisfies IShoppingMallProduct.ICreate;

  const productA: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: baseProductBody(),
    });
  typia.assert(productA);

  const productB: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: baseProductBody(),
    });
  typia.assert(productB);

  // 5. Switch to admin and link Product A to the category
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      ip: null,
      href: "https://admin.example.com/login" as string & tags.Format<"uri">,
      referrer: "https://admin.example.com/" as string & tags.Format<"uri">,
    } satisfies IShoppingMallAdminLogin.ICreate,
  });

  const productCategoryBody = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;

  const productACategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: productA.id,
        body: productCategoryBody,
      },
    );
  typia.assert(productACategory);

  // 6. As admin, create attributes for Product A and Product B
  const attributeBody = (
    name: string,
    order: number,
  ): IShoppingMallProductAttribute.ICreate =>
    ({
      name,
      display_name: name,
      data_type: "string",
      is_variant_dimension: true,
      display_order: order as number & tags.Type<"int32"> & tags.Minimum<0>,
    }) satisfies IShoppingMallProductAttribute.ICreate;

  const attributeA: IShoppingMallProductAttribute =
    await api.functional.shoppingMall.admin.products.attributes.create(
      connection,
      {
        productId: productA.id as string & tags.Format<"uuid">,
        body: attributeBody("color", 0),
      },
    );
  typia.assert(attributeA);

  const attributeB: IShoppingMallProductAttribute =
    await api.functional.shoppingMall.admin.products.attributes.create(
      connection,
      {
        productId: productB.id as string & tags.Format<"uuid">,
        body: attributeBody("size", 1),
      },
    );
  typia.assert(attributeB);

  // 7. Switch to seller and create a value under Product A's attribute
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      ip: null,
      href: "https://seller.example.com/login-2" as string & tags.Format<"uri">,
      referrer: "https://seller.example.com/" as string & tags.Format<"uri">,
    } satisfies IShoppingMallSellerAuthLogin.IRequest,
  });

  const attributeValueBody = (
    value: string,
    order: number,
  ): IShoppingMallProductAttributeValue.ICreate =>
    ({
      value,
      display_value: value,
      display_order: order as number & tags.Type<"int32">,
    }) satisfies IShoppingMallProductAttributeValue.ICreate;

  const valueA: IShoppingMallProductAttributeValue =
    await api.functional.shoppingMall.seller.products.attributes.values.create(
      connection,
      {
        productId: productA.id as string & tags.Format<"uuid">,
        productAttributeId: attributeA.id,
        body: attributeValueBody("red", 0),
      },
    );
  typia.assert(valueA);

  // 8. Switch to admin for cross-hierarchy delete attempts
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      ip: null,
      href: "https://admin.example.com/login-2" as string & tags.Format<"uri">,
      referrer: "https://admin.example.com/" as string & tags.Format<"uri">,
    } satisfies IShoppingMallAdminLogin.ICreate,
  });

  // Attempt 1: cross-product mismatch (Product B id with Product A's attribute/value)
  await TestValidator.error("cross-product delete must fail", async () => {
    await api.functional.shoppingMall.admin.products.attributes.values.erase(
      connection,
      {
        productId: productB.id as string & tags.Format<"uuid">,
        productAttributeId: attributeA.id as string & tags.Format<"uuid">,
        productAttributeValueId: valueA.id as string & tags.Format<"uuid">,
      },
    );
  });

  // Attempt 2: cross-attribute mismatch under same product (Product A with Product B's attribute)
  await TestValidator.error("cross-attribute delete must fail", async () => {
    await api.functional.shoppingMall.admin.products.attributes.values.erase(
      connection,
      {
        productId: productA.id as string & tags.Format<"uuid">,
        productAttributeId: attributeB.id as string & tags.Format<"uuid">,
        productAttributeValueId: valueA.id as string & tags.Format<"uuid">,
      },
    );
  });

  // 9. Positive control: correct hierarchy delete should succeed
  await api.functional.shoppingMall.admin.products.attributes.values.erase(
    connection,
    {
      productId: productA.id as string & tags.Format<"uuid">,
      productAttributeId: attributeA.id as string & tags.Format<"uuid">,
      productAttributeValueId: valueA.id as string & tags.Format<"uuid">,
    },
  );
}
