import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSkuOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuOption";
import type { IShoppingMallSkuOptionGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuOptionGroup";

export async function test_api_shopping_mall_seller_shopping_mall_sku_option_creation_by_seller_with_existing_option_group(
  connection: api.IConnection,
) {
  // 1. Seller account registration and authentication
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerCreateBody = {
    email: sellerEmail,
    password: "SellerPassword123!",
    name: RandomGenerator.name(),
  } satisfies IShoppingMallSeller.ICreate;

  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerCreateBody,
    });
  typia.assert(sellerAuth);

  // Seller login for token refresh and session
  const sellerLoginBody = {
    email: sellerEmail,
    password: "SellerPassword123!",
    href: "https://seller-dashboard.example.com/login",
    referrer: "https://seller-dashboard.example.com",
  } satisfies IShoppingMallSeller.ILogin;
  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoggedIn);

  // 2. Admin account registration and authentication (to create SKU Option Group)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminCreateBody = {
    email: adminEmail,
    name: RandomGenerator.name(),
    password: "AdminPassword123!",
    role: "admin",
  } satisfies IShoppingMallAdmin.ICreate;

  const adminAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(adminAuth);

  // Admin login
  const adminLoginBody = {
    email: adminEmail,
    password: "AdminPassword123!",
    href: "https://admin-portal.example.com/login",
    referrer: "https://admin-portal.example.com",
  } satisfies IShoppingMallAdmin.ILogin;
  const adminLoggedIn: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  // 3. Create SKU Option Group as admin
  // For uniqueness, generate a unique code and name
  const skuOptionGroupCreateBody = {
    code: `group-${RandomGenerator.alphaNumeric(8)}`,
    name: `Option Group ${RandomGenerator.name(2)}`,
    description: "Test SKU Option Group created by e2e test",
  } satisfies IShoppingMallSkuOptionGroup.ICreate;

  // The API path and authorization will follow from connection context (admin authenticated)
  const createdSkuOptionGroup: IShoppingMallSkuOptionGroup =
    await api.functional.shoppingMall.admin.shoppingMallSkuOptionGroups.create(
      connection,
      {
        body: skuOptionGroupCreateBody,
      },
    );
  typia.assert(createdSkuOptionGroup);

  TestValidator.equals(
    "SKU Option Group code should match input",
    createdSkuOptionGroup.code,
    skuOptionGroupCreateBody.code,
  );

  // 4. Switch back to seller authentication context
  // Seller already logged in - no explicit headers manipulation needed

  // 5. Create SKU Option as seller under the created SKU Option Group
  // Generate unique SKU option code and name
  const skuOptionCreateBody = {
    code: `option-${RandomGenerator.alphaNumeric(8)}`,
    groupCode: createdSkuOptionGroup.code,
    name: `Option ${RandomGenerator.name(1)}`,
    priceAdjustment: typia.random<
      number & tags.Minimum<-999999999> & tags.Maximum<999999999>
    >(),
    deletedAt: null,
  } satisfies IShoppingMallSkuOption.ICreate;

  const createdSkuOption: IShoppingMallSkuOption =
    await api.functional.shoppingMall.seller.shoppingMallSkuOptions.create(
      connection,
      {
        body: skuOptionCreateBody,
      },
    );
  typia.assert(createdSkuOption);

  TestValidator.equals(
    "SKU Option code should match input",
    createdSkuOption.code,
    skuOptionCreateBody.code,
  );

  TestValidator.equals(
    "SKU Option group code should match",
    createdSkuOption.groupCode,
    createdSkuOptionGroup.code,
  );

  TestValidator.equals(
    "SKU Option name should match input",
    createdSkuOption.name,
    skuOptionCreateBody.name,
  );

  TestValidator.predicate(
    "price adjustment within valid range",
    createdSkuOption.priceAdjustment >= -999999999 &&
      createdSkuOption.priceAdjustment <= 999999999,
  );
}
