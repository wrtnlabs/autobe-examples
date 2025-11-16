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
 * Validates that a seller cannot update product attributes belonging to a
 * product they do not own.
 *
 * This test ensures that ownership boundaries are enforced for product
 * attribute modification. It does so by creating two distinct sellers:
 *
 * 1. Seller A registers and creates a product
 * 2. Seller A, via admin endpoint, adds an attribute to that product
 * 3. Seller B registers
 * 4. Seller B logs in, then attempts to update the attribute on Seller A's product
 *    via the seller endpoint
 * 5. The update attempt from Seller B must fail with an authorization error,
 *    validating that sellers are restricted from touching others' product
 *    attributes.
 *
 * Steps:
 *
 * 1. Register Seller A (generates unique email and company info)
 * 2. Log in as Seller A (token context is maintained by SDK)
 * 3. Seller A creates a product
 * 4. Register a new admin (not strictly necessary here for attribute creation but
 *    listed in dependencies)
 * 5. Create an attribute for Seller A's product via the admin endpoint
 * 6. Register Seller B
 * 7. Log in as Seller B (context switched)
 * 8. Attempt to update the attribute on Seller A's product as Seller B (providing
 *    a new name and position)
 * 9. Validate failure: update must be rejected with an error
 *    (authorization/permission denied)
 */
export async function test_api_product_attribute_update_by_seller_unauthorized_product(
  connection: api.IConnection,
) {
  // 1. Register Seller A
  const sellerAEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerAPassword: string = RandomGenerator.alphaNumeric(12);
  const sellerARegNum: string = RandomGenerator.alphabets(6).toUpperCase();
  const sellerA: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerAEmail,
        password: sellerAPassword as string & tags.Format<"password">,
        business_name: RandomGenerator.name(),
        registration_number: sellerARegNum,
        business_phone: RandomGenerator.mobile(),
        href: "https://seller-a.test/path",
        referrer: "https://referrer.test/",
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(sellerA);

  // 2. Seller A creates a product (context is sellerA)
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.products.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        default_price: 10000,
        business_status: "draft",
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);

  // 3. Create an admin to call the admin endpoint for attribute creation
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = RandomGenerator.alphaNumeric(12) as string &
    tags.Format<"password">;
  const adminName: string = RandomGenerator.name(2) as string &
    tags.MinLength<1>;
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: adminName,
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // 4. Login as admin to allow attribute creation (token updated)
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdmin.ILogin,
  });

  // 5. Create attribute for the product via admin endpoint
  const attribute: IShoppingMallProductAttribute =
    await api.functional.shoppingMall.admin.products.attributes.create(
      connection,
      {
        productId: product.id,
        body: {
          attribute_name: RandomGenerator.name(1) as string & tags.MinLength<1>,
          position: 0,
        } satisfies IShoppingMallProductAttribute.ICreate,
      },
    );
  typia.assert(attribute);

  // 6. Register Seller B
  const sellerBEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerBPassword: string = RandomGenerator.alphaNumeric(12);
  const sellerBRegNum: string = RandomGenerator.alphabets(6).toUpperCase();
  const sellerB: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerBEmail,
        password: sellerBPassword as string & tags.Format<"password">,
        business_name: RandomGenerator.name(),
        registration_number: sellerBRegNum,
        business_phone: RandomGenerator.mobile(),
        href: "https://seller-b.test/path",
        referrer: "https://referrer.test/",
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(sellerB);

  // 7. Login as Seller B (context switch)
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerBEmail,
      password: sellerBPassword as string &
        tags.MinLength<8> &
        tags.Format<"password">,
      href: "https://seller-b.test/login",
      referrer: "https://referrer.test/login",
    } satisfies IShoppingMallSeller.ILogin,
  });

  // 8. Seller B attempts to update Seller A's product attribute (should fail)
  await TestValidator.error(
    "seller B forbidden from updating attribute on another seller's product",
    async () => {
      await api.functional.shoppingMall.seller.products.attributes.update(
        connection,
        {
          productId: product.id,
          attributeId: attribute.id,
          body: {
            attribute_name: RandomGenerator.name(1),
            position: 1,
          } satisfies IShoppingMallProductAttribute.IUpdate,
        },
      );
    },
  );
}
