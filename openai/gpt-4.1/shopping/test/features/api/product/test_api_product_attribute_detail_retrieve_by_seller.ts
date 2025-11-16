import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAttribute";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate that a seller can retrieve the details of a product attribute they
 * own.
 *
 * This test simulates the following workflow:
 *
 * 1. Register a seller to obtain a seller account and authentication context.
 * 2. As the seller, create a product; retain the product ID for further actions.
 * 3. Register an admin user and login as admin to obtain admin context.
 * 4. As admin, create a product attribute for the seller's product.
 * 5. Switch back to seller context by logging in as the seller.
 * 6. As seller, retrieve the created attribute for the given product and attribute
 *    IDs.
 * 7. Validate the response structure, business linkage, and that all fields match
 *    the attribute created.
 */
export async function test_api_product_attribute_detail_retrieve_by_seller(
  connection: api.IConnection,
) {
  // 1. Register Seller
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerPassword: string = RandomGenerator.alphaNumeric(10);
  const sellerRegNum: string = RandomGenerator.alphaNumeric(12);
  const sellerBusinessName: string = RandomGenerator.name(2);
  const sellerBusinessPhone: string = RandomGenerator.mobile();
  const sellerHref: string =
    "https://seller-register.test/" + RandomGenerator.alphaNumeric(8);
  const sellerReferrer: string =
    "https://test-referrer.test/" + RandomGenerator.alphaNumeric(8);
  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        business_name: sellerBusinessName,
        registration_number: sellerRegNum,
        business_phone: sellerBusinessPhone,
        href: sellerHref,
        referrer: sellerReferrer,
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(sellerAuth);

  // 2. Seller creates product
  const productTitle: string = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 4,
  });
  const productDesc: string = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 5,
  });
  const productPrice: number = Math.floor(100 + Math.random() * 900); // 100~999
  const productStatus: string = RandomGenerator.pick([
    "draft",
    "published",
    "archived",
    "blocked",
    "pending_approval",
  ] as const);

  const createdProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.products.create(connection, {
      body: {
        title: productTitle,
        description: productDesc,
        default_price: productPrice,
        business_status: productStatus,
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(createdProduct);

  // 3. Register admin and login as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminName = RandomGenerator.name(2);
  await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: adminName,
    } satisfies IShoppingMallAdmin.ICreate,
  });
  // Switch to admin session
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdmin.ILogin,
  });

  // 4. Admin creates product attribute
  const attributeName: string = RandomGenerator.name(1);
  const attributePosition: number = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<0>
  >();
  const createdAttribute: IShoppingMallProductAttribute =
    await api.functional.shoppingMall.admin.products.attributes.create(
      connection,
      {
        productId: createdProduct.id,
        body: {
          attribute_name: attributeName,
          position: attributePosition,
        } satisfies IShoppingMallProductAttribute.ICreate,
      },
    );
  typia.assert(createdAttribute);

  // 5. Switch back to seller (login)
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: sellerHref,
      referrer: sellerReferrer,
    } satisfies IShoppingMallSeller.ILogin,
  });

  // 6. Seller retrieves attribute detail
  const retrieved: IShoppingMallProductAttribute =
    await api.functional.shoppingMall.seller.products.attributes.at(
      connection,
      {
        productId: createdProduct.id,
        attributeId: createdAttribute.id,
      },
    );
  typia.assert(retrieved);
  // 7. Business linkage validation
  TestValidator.equals(
    "attribute id matches",
    retrieved.id,
    createdAttribute.id,
  );
  TestValidator.equals(
    "parent product id matches",
    retrieved.shopping_mall_product_id,
    createdProduct.id,
  );
  TestValidator.equals(
    "attribute name matches",
    retrieved.attribute_name,
    attributeName,
  );
  TestValidator.equals(
    "attribute position matches",
    retrieved.position,
    attributePosition,
  );
}
