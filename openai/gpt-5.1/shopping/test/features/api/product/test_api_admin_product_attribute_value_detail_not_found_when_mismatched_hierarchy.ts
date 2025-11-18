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

export async function test_api_admin_product_attribute_value_detail_not_found_when_mismatched_hierarchy(
  connection: api.IConnection,
) {
  // 1. Prepare random base data
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const password: string & tags.Format<"password"> = "Passw0rd!" as string &
    tags.Format<"password">;
  const href: string & tags.Format<"uri"> =
    "https://admin.shoppingmall.test/join" as string & tags.Format<"uri">;
  const referrer: string & tags.Format<"uri"> =
    "https://shoppingmall.test/landing" as string & tags.Format<"uri">;

  // 2. Seller join & login (seller A)
  const sellerJoinBody = {
    email: sellerEmail,
    password,
    ip: null,
    href,
    referrer,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  const sellerLoginBody = {
    email: sellerEmail,
    password,
    ip: null,
    href,
    referrer,
  } satisfies IShoppingMallSellerAuthLogin.IRequest;
  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoggedIn);

  // 3. Admin join & login
  const adminJoinBody = {
    email: adminEmail,
    password,
    ip: null,
    href,
    referrer,
  } satisfies IShoppingMallAdminJoin.ICreate;
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  const adminLoginBody = {
    email: adminEmail,
    password,
    ip: null,
    href,
    referrer,
  } satisfies IShoppingMallAdminLogin.ICreate;
  const adminLoggedIn: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  // 4. As seller: create product A and product B
  const productCreateBase = () =>
    ({
      code: RandomGenerator.alphaNumeric(12),
      title: RandomGenerator.paragraph({ sentences: 3 }),
      summary: RandomGenerator.paragraph({ sentences: 5 }),
      description: RandomGenerator.content({ paragraphs: 2 }),
      brand: RandomGenerator.paragraph({ sentences: 1 }),
      model_name: RandomGenerator.paragraph({ sentences: 1 }),
      status: "active",
      primary_image_uri:
        "https://cdn.shoppingmall.test/images/" +
        RandomGenerator.alphaNumeric(16),
      default_locale: "en-US",
    }) satisfies IShoppingMallProduct.ICreate;

  const productA: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBase(),
    });
  typia.assert(productA);

  const productB: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBase(),
    });
  typia.assert(productB);

  // 5. As admin: create a category and link both products
  const categoryBody = {
    parent_id: null,
    slug: "category-" + RandomGenerator.alphaNumeric(8),
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

  const productBCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: productB.id,
        body: productCategoryBody,
      },
    );
  typia.assert(productBCategory);

  // 6. As admin: create attributes AttrA for product A and AttrB for product B
  const attributeABody = {
    name: "color_a" as string & tags.MinLength<1>,
    display_name: "Color A" as string & tags.MinLength<1>,
    data_type: "string" as string & tags.MinLength<1>,
    is_variant_dimension: true,
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductAttribute.ICreate;

  const attributeBBody = {
    name: "color_b" as string & tags.MinLength<1>,
    display_name: "Color B" as string & tags.MinLength<1>,
    data_type: "string" as string & tags.MinLength<1>,
    is_variant_dimension: true,
    display_order: 1 as number & tags.Type<"int32"> & tags.Minimum<0>,
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

  const attributeB: IShoppingMallProductAttribute =
    await api.functional.shoppingMall.admin.products.attributes.create(
      connection,
      {
        productId: productB.id,
        body: attributeBBody,
      },
    );
  typia.assert(attributeB);

  // 7. As seller: create attribute values ValA and ValB
  const valueABody = {
    value: "RED",
    display_value: "Red",
    display_order: 0 as number & tags.Type<"int32">,
  } satisfies IShoppingMallProductAttributeValue.ICreate;

  const valueBBody = {
    value: "BLUE",
    display_value: "Blue",
    display_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallProductAttributeValue.ICreate;

  const valueA: IShoppingMallProductAttributeValue =
    await api.functional.shoppingMall.seller.products.attributes.values.create(
      connection,
      {
        productId: productA.id,
        productAttributeId: attributeA.id,
        body: valueABody,
      },
    );
  typia.assert(valueA);

  const valueB: IShoppingMallProductAttributeValue =
    await api.functional.shoppingMall.seller.products.attributes.values.create(
      connection,
      {
        productId: productB.id,
        productAttributeId: attributeB.id,
        body: valueBBody,
      },
    );
  typia.assert(valueB);

  // 8. As admin: successful control read with correct hierarchy (A, AttrA, ValA)
  const correctDetail: IShoppingMallProductAttributeValue =
    await api.functional.shoppingMall.admin.products.attributes.values.at(
      connection,
      {
        productId: productA.id,
        productAttributeId: attributeA.id,
        productAttributeValueId: valueA.id,
      },
    );
  typia.assert(correctDetail);

  TestValidator.equals(
    "correct detail returns expected value id",
    correctDetail.id,
    valueA.id,
  );
  TestValidator.equals(
    "correct detail returns expected attribute id",
    correctDetail.attribute.id,
    attributeA.id,
  );

  // 9. As admin: mismatched hierarchy (productA, attributeA, valueB) should error
  await TestValidator.error(
    "mismatched hierarchy should result in not-found style error",
    async () => {
      await api.functional.shoppingMall.admin.products.attributes.values.at(
        connection,
        {
          productId: productA.id,
          productAttributeId: attributeA.id,
          productAttributeValueId: valueB.id,
        },
      );
    },
  );

  // 10. Unauthenticated call with mismatched hierarchy should be rejected by auth
  const unauthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthenticated mismatched call should be rejected by authorization",
    async () => {
      await api.functional.shoppingMall.admin.products.attributes.values.at(
        unauthConnection,
        {
          productId: productA.id,
          productAttributeId: attributeA.id,
          productAttributeValueId: valueB.id,
        },
      );
    },
  );
}
