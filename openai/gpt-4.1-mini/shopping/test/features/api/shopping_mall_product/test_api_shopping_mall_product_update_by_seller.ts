import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_shopping_mall_product_update_by_seller(
  connection: api.IConnection,
) {
  // Step 1: Seller joins (creates an account)
  const sellerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Seller1234",
    name: RandomGenerator.name(),
  } satisfies IShoppingMallSeller.ICreate;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerCreateBody,
    });
  typia.assert(seller);

  // Step 2: Admin joins (creates an account)
  const adminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Admin1234",
    name: RandomGenerator.name(),
    role: "admin",
  } satisfies IShoppingMallAdmin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminCreateBody });
  typia.assert(admin);

  // Step 3: Admin creates a product
  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_active: true,
  } satisfies IShoppingMallProduct.ICreate;

  const createdProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.admin.shoppingMallProducts.create(
      connection,
      { body: productCreateBody },
    );
  typia.assert(createdProduct);

  // Validate created product matches request
  TestValidator.equals(
    "created product code",
    createdProduct.code,
    productCreateBody.code,
  );
  TestValidator.equals(
    "created product name",
    createdProduct.name,
    productCreateBody.name,
  );
  TestValidator.equals(
    "created product description",
    createdProduct.description,
    productCreateBody.description,
  );
  TestValidator.equals(
    "created product is_active",
    createdProduct.is_active,
    productCreateBody.is_active,
  );

  // Step 4: Seller logs in to authenticate session for update
  const sellerLoginBody = {
    email: sellerCreateBody.email,
    password: sellerCreateBody.password,
    href: "https://example.com/login",
    referrer: "https://example.com",
  } satisfies IShoppingMallSeller.ILogin;

  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  // Step 5: Seller updates product
  const productUpdateBody = {
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    is_active: false,
  } satisfies IShoppingMallProduct.IUpdate;

  const updatedProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.shoppingMallProducts.update(
      connection,
      {
        productCode: createdProduct.code,
        body: productUpdateBody,
      },
    );
  typia.assert(updatedProduct);

  // Validate updated product matches update request
  TestValidator.equals(
    "updated product code remains unchanged",
    updatedProduct.code,
    createdProduct.code,
  );
  TestValidator.equals(
    "updated product name",
    updatedProduct.name,
    productUpdateBody.name,
  );
  TestValidator.equals(
    "updated product description",
    updatedProduct.description,
    productUpdateBody.description,
  );
  TestValidator.equals(
    "updated product is_active",
    updatedProduct.is_active,
    productUpdateBody.is_active,
  );
}
