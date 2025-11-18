import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAttribute";
import type { IShoppingMallProductAttributeValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAttributeValue";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";

export async function test_api_seller_create_product_attribute_value_uniqueness_per_attribute(
  connection: api.IConnection,
) {
  // 1. Register seller and establish initial seller session
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerPassword: string & tags.Format<"password"> =
    RandomGenerator.alphaNumeric(16) as string & tags.Format<"password">;

  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://seller.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuth);

  // 2. As seller, create first product P1
  const productCreateBodyP1 = {
    code: RandomGenerator.alphaNumeric(8),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "AUTO-BRAND",
    model_name: "MODEL-P1",
    status: "active",
    primary_image_uri: "https://cdn.example.com/images/p1.png" as string &
      tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const productP1: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBodyP1,
    });
  typia.assert(productP1);

  // 3. Register admin and establish admin session
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string & tags.Format<"password"> =
    RandomGenerator.alphaNumeric(18) as string & tags.Format<"password">;

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuth);

  // 4. As admin, create first attribute Attr1 for P1
  const attributeCreateBody1 = {
    name: "color" as string & tags.MinLength<1>,
    display_name: "Color" as string & tags.MinLength<1>,
    data_type: "string" as string & tags.MinLength<1>,
    is_variant_dimension: true,
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductAttribute.ICreate;

  const attribute1: IShoppingMallProductAttribute =
    await api.functional.shoppingMall.admin.products.attributes.create(
      connection,
      {
        productId: productP1.id,
        body: attributeCreateBody1,
      },
    );
  typia.assert(attribute1);

  // Switch back to seller before calling seller-specific endpoints
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://seller.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLoginAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoginAuth);

  // 5. As seller, create first value V1 under Attr1 with canonical value "RED"
  const valueCreateBody1 = {
    value: "RED",
    display_value: "Red",
    display_order: 0 as number & tags.Type<"int32">,
  } satisfies IShoppingMallProductAttributeValue.ICreate;

  const value1: IShoppingMallProductAttributeValue =
    await api.functional.shoppingMall.seller.products.attributes.values.create(
      connection,
      {
        productId: productP1.id,
        productAttributeId: attribute1.id,
        body: valueCreateBody1,
      },
    );
  typia.assert(value1);

  TestValidator.equals(
    "first value attribute id should match Attr1 id",
    value1.attribute.id,
    attribute1.id,
  );
  TestValidator.equals(
    "first value canonical value is RED",
    value1.value,
    "RED",
  );

  // 6. Attempt to create duplicate value under Attr1 with same canonical value "RED"
  const duplicateValueBody = {
    value: "RED",
    display_value: "Red duplicate",
    display_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallProductAttributeValue.ICreate;

  await TestValidator.error(
    "duplicate attribute value under same attribute should fail",
    async () => {
      await api.functional.shoppingMall.seller.products.attributes.values.create(
        connection,
        {
          productId: productP1.id,
          productAttributeId: attribute1.id,
          body: duplicateValueBody,
        },
      );
    },
  );

  // Switch to admin again for creating the second attribute
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLoginAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAuth);

  // 7. As admin, create second attribute Attr2 for P1
  const attributeCreateBody2 = {
    name: "accent_color" as string & tags.MinLength<1>,
    display_name: "Accent Color" as string & tags.MinLength<1>,
    data_type: "string" as string & tags.MinLength<1>,
    is_variant_dimension: true,
    display_order: 1 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductAttribute.ICreate;

  const attribute2: IShoppingMallProductAttribute =
    await api.functional.shoppingMall.admin.products.attributes.create(
      connection,
      {
        productId: productP1.id,
        body: attributeCreateBody2,
      },
    );
  typia.assert(attribute2);

  // Switch back to seller for creating values under Attr2
  const sellerLoginAuth2: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoginAuth2);

  // 8. As seller, create value under Attr2 with same canonical value "RED" (should succeed)
  const valueCreateBody2 = {
    value: "RED",
    display_value: "Red Accent",
    display_order: 0 as number & tags.Type<"int32">,
  } satisfies IShoppingMallProductAttributeValue.ICreate;

  const value2: IShoppingMallProductAttributeValue =
    await api.functional.shoppingMall.seller.products.attributes.values.create(
      connection,
      {
        productId: productP1.id,
        productAttributeId: attribute2.id,
        body: valueCreateBody2,
      },
    );
  typia.assert(value2);

  TestValidator.equals(
    "second value attribute id should match Attr2 id",
    value2.attribute.id,
    attribute2.id,
  );
  TestValidator.equals(
    "second value canonical value is also RED",
    value2.value,
    "RED",
  );

  // Switch to admin again to configure second product P2
  const adminLoginAuth2: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAuth2);

  // 9. Optional: create second product P2 and repeat same canonical value under its own attribute
  const productCreateBodyP2 = {
    code: RandomGenerator.alphaNumeric(8),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "AUTO-BRAND",
    model_name: "MODEL-P2",
    status: "active",
    primary_image_uri: "https://cdn.example.com/images/p2.png" as string &
      tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  // Switch back to seller before creating P2 (seller endpoint)
  const sellerLoginAuth3: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoginAuth3);

  const productP2: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBodyP2,
    });
  typia.assert(productP2);

  // Switch to admin to create attribute for P2
  const adminLoginAuth3: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAuth3);

  const attributeCreateBody3 = {
    name: "color" as string & tags.MinLength<1>,
    display_name: "Color" as string & tags.MinLength<1>,
    data_type: "string" as string & tags.MinLength<1>,
    is_variant_dimension: true,
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductAttribute.ICreate;

  const attribute3: IShoppingMallProductAttribute =
    await api.functional.shoppingMall.admin.products.attributes.create(
      connection,
      {
        productId: productP2.id,
        body: attributeCreateBody3,
      },
    );
  typia.assert(attribute3);

  // Switch back to seller to create value under Attr3
  const sellerLoginAuth4: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoginAuth4);

  const valueCreateBody3 = {
    value: "RED",
    display_value: "Red P2",
    display_order: 0 as number & tags.Type<"int32">,
  } satisfies IShoppingMallProductAttributeValue.ICreate;

  const value3: IShoppingMallProductAttributeValue =
    await api.functional.shoppingMall.seller.products.attributes.values.create(
      connection,
      {
        productId: productP2.id,
        productAttributeId: attribute3.id,
        body: valueCreateBody3,
      },
    );
  typia.assert(value3);

  TestValidator.equals(
    "third value attribute id should match Attr3 id",
    value3.attribute.id,
    attribute3.id,
  );
  TestValidator.equals(
    "third value canonical value is RED on second product",
    value3.value,
    "RED",
  );
}
