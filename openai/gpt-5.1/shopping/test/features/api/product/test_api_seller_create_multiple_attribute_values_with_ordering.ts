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

/**
 * Validate that a seller can create multiple ordered attribute values for a
 * product attribute.
 *
 * Business context:
 *
 * - Sellers manage their own products and variant attributes (like size or
 *   color).
 * - Admins define attribute metadata for products.
 * - Sellers then register concrete allowed values for these attributes.
 *
 * This test covers a multi-actor workflow:
 *
 * 1. Seller joins and implicitly obtains a token.
 * 2. Seller creates a product that will own the attribute.
 * 3. Admin joins and logs in to gain admin context.
 * 4. Admin creates a product attribute (for example, "size").
 * 5. Seller creates multiple attribute values (S, M, L) with explicit
 *    display_order.
 * 6. The test validates that values are associated with the correct
 *    attribute/product and that display_order, value, and display_value are
 *    echoed correctly.
 * 7. The test additionally attempts to create a duplicate canonical value for the
 *    same attribute and expects a generic failure (business uniqueness
 *    constraint), validated via TestValidator.error without relying on status
 *    codes.
 */
export async function test_api_seller_create_multiple_attribute_values_with_ordering(
  connection: api.IConnection,
) {
  // 1. Seller joins the platform (registration + initial auth token)
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://seller-portal.example.com/join",
    referrer: "https://seller-portal.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // 2. Seller creates a product that will own the attribute
  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(12),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: RandomGenerator.paragraph({ sentences: 2 }),
    model_name: RandomGenerator.paragraph({ sentences: 2 }),
    status: "active",
    primary_image_uri:
      "https://cdn.example.com/images/" +
      RandomGenerator.alphaNumeric(16) +
      ".jpg",
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 3. Admin joins and logs in to define the attribute metadata
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin-portal.example.com/join",
    referrer: "https://admin-portal.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin-portal.example.com/login",
    referrer: "https://admin-portal.example.com/landing",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLoggedIn: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  // 4. Admin creates a product attribute (e.g., size)
  const attributeCreateBody = {
    name: "size" as string & tags.MinLength<1>,
    display_name: "Size" as string & tags.MinLength<1>,
    data_type: "string" as string & tags.MinLength<1>,
    is_variant_dimension: true,
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductAttribute.ICreate;

  const attribute: IShoppingMallProductAttribute =
    await api.functional.shoppingMall.admin.products.attributes.create(
      connection,
      {
        productId: product.id,
        body: attributeCreateBody,
      },
    );
  typia.assert(attribute);

  // 5. Switch back to seller context explicitly via seller login
  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller-portal.example.com/login",
    referrer: "https://seller-portal.example.com/landing",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoggedIn);

  // 6. Seller creates multiple attribute values with ordered display_order
  const valuePayloads: IShoppingMallProductAttributeValue.ICreate[] = [
    {
      value: "S",
      display_value: "Small",
      display_order: 1 as number & tags.Type<"int32">,
    },
    {
      value: "M",
      display_value: "Medium",
      display_order: 2 as number & tags.Type<"int32">,
    },
    {
      value: "L",
      display_value: "Large",
      display_order: 3 as number & tags.Type<"int32">,
    },
  ];

  const createdValues: IShoppingMallProductAttributeValue[] = [];

  for (const payload of valuePayloads) {
    const created: IShoppingMallProductAttributeValue =
      await api.functional.shoppingMall.seller.products.attributes.values.create(
        connection,
        {
          productId: product.id,
          productAttributeId: attribute.id,
          body: payload,
        },
      );
    typia.assert(created);
    createdValues.push(created);
  }

  // 7. Validate the created values
  // 7-1. Ensure each created value matches the corresponding payload fields
  for (let i = 0; i < valuePayloads.length; i++) {
    const payload = valuePayloads[i];
    const created = createdValues[i];

    TestValidator.equals(
      `attribute value ${payload.value} - canonical value`,
      created.value,
      payload.value,
    );
    TestValidator.equals(
      `attribute value ${payload.value} - display value`,
      created.display_value,
      payload.display_value,
    );
    TestValidator.equals(
      `attribute value ${payload.value} - display order`,
      created.display_order,
      payload.display_order,
    );

    // Association: attribute summary should reference the same product and attribute ids
    TestValidator.equals(
      `attribute value ${payload.value} - attribute id matches`,
      created.attribute.id,
      attribute.id,
    );
    TestValidator.equals(
      `attribute value ${payload.value} - attribute name matches`,
      created.attribute.name,
      attribute.name,
    );
    TestValidator.equals(
      `attribute value ${payload.value} - attribute display_name matches`,
      created.attribute.display_name,
      attribute.display_name,
    );
    TestValidator.equals(
      `attribute value ${payload.value} - attribute is_variant_dimension matches`,
      created.attribute.is_variant_dimension,
      attribute.is_variant_dimension,
    );
    TestValidator.equals(
      `attribute value ${payload.value} - attribute display_order matches`,
      created.attribute.display_order,
      attribute.display_order,
    );
    TestValidator.equals(
      `attribute value ${payload.value} - attribute.product.id matches`,
      created.attribute.product.id,
      attribute.product.id,
    );
  }

  // 7-2. Validate that created values are ordered by display_order according to payload
  const sortedByDisplayOrder = [...createdValues].sort(
    (a, b) => a.display_order - b.display_order,
  );

  TestValidator.equals(
    "attribute values are ordered by display_order",
    sortedByDisplayOrder.map((v) => v.value),
    valuePayloads.map((p) => p.value),
  );

  // 7-3. Validate timestamps (non-null created_at/updated_at, null or undefined deleted_at)
  for (const created of createdValues) {
    TestValidator.predicate(
      `attribute value ${created.value} has non-null created_at`,
      created.created_at !== null && created.created_at !== undefined,
    );
    TestValidator.predicate(
      `attribute value ${created.value} has non-null updated_at`,
      created.updated_at !== null && created.updated_at !== undefined,
    );
    TestValidator.predicate(
      `attribute value ${created.value} has null or undefined deleted_at`,
      created.deleted_at === null || created.deleted_at === undefined,
    );
  }

  // 8. Negative scenario: attempting to reuse the same canonical value for the same attribute
  await TestValidator.error(
    "duplicate canonical value for the same attribute should fail",
    async () => {
      await api.functional.shoppingMall.seller.products.attributes.values.create(
        connection,
        {
          productId: product.id,
          productAttributeId: attribute.id,
          body: {
            value: "S",
            display_value: "Small Duplicate",
            display_order: 10 as number & tags.Type<"int32">,
          } satisfies IShoppingMallProductAttributeValue.ICreate,
        },
      );
    },
  );
}
