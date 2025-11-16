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
 * Validate that an admin can retrieve full details of a product attribute for a
 * given product.
 *
 * Steps:
 *
 * 1. Register seller and admin accounts with random values.
 * 2. Seller login to perform actions.
 * 3. Seller creates a product with random valid data.
 * 4. Seller creates a product attribute (e.g., 'Color') for that product.
 * 5. Admin login to acquire admin-level session and token.
 * 6. Admin retrieves details for the created attribute using the admin endpoint.
 * 7. Validate linkage, data fields, ownership, and structure of the attribute with
 *    business assertions.
 */
export async function test_api_product_attribute_detail_retrieve_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a seller with password stored and reused for login
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(12);
  const sellerRegistrationNumber = RandomGenerator.alphaNumeric(10);
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        business_name: RandomGenerator.name(2),
        registration_number: sellerRegistrationNumber,
        business_phone: RandomGenerator.mobile(),
        href: "https://seller-page.example.com/",
        referrer: "https://shoppingmall.example.com/",
        ip: null,
      },
    });
  typia.assert(seller);

  // 2. Register an admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: RandomGenerator.name(),
      },
    });
  typia.assert(admin);

  // 3. Seller login for session
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: "https://seller-login.example.com/",
      referrer: "https://shoppingmall.example.com/",
      ip: null,
    },
  });

  // 4. Seller creates a product
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.products.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        default_price: typia.random<number>(),
        business_status: "published",
      },
    });
  typia.assert(product);

  // 5. Seller creates a product attribute
  const attribute: IShoppingMallProductAttribute =
    await api.functional.shoppingMall.seller.products.attributes.create(
      connection,
      {
        productId: product.id,
        body: {
          attribute_name: RandomGenerator.name(1),
          position: 0,
        },
      },
    );
  typia.assert(attribute);

  // 6. Admin login for session
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    },
  });

  // 7. Admin retrieves the attribute details using the admin endpoint
  const retrieved: IShoppingMallProductAttribute =
    await api.functional.shoppingMall.admin.products.attributes.at(connection, {
      productId: product.id,
      attributeId: attribute.id,
    });
  typia.assert(retrieved);

  // 8. Validate the linkage and all required fields
  TestValidator.equals("attribute id matches", retrieved.id, attribute.id);
  TestValidator.equals(
    "product id linkage valid",
    retrieved.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals(
    "attribute name matches",
    retrieved.attribute_name,
    attribute.attribute_name,
  );
  TestValidator.equals(
    "attribute position matches",
    retrieved.position,
    attribute.position,
  );
  TestValidator.predicate(
    "created_at is an ISO string",
    typeof retrieved.created_at === "string" &&
      !!Date.parse(retrieved.created_at),
  );
  TestValidator.predicate(
    "updated_at is an ISO string",
    typeof retrieved.updated_at === "string" &&
      !!Date.parse(retrieved.updated_at),
  );
}
