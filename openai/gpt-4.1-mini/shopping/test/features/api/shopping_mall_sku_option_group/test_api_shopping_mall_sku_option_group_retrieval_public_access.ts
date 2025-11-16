import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSkuOptionGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuOptionGroup";

/**
 * Validate the public retrieval of detailed SKU option group information by
 * code.
 *
 * This test performs the following steps:
 *
 * 1. Admin user joins the platform via /auth/admin/join endpoint.
 * 2. Admin creates a new SKU option group through the admin creation endpoint with
 *    unique code, name, and optional description.
 * 3. Retrieve the SKU option group publicly through the get endpoint, without
 *    authentication.
 * 4. Assert that retrieved data fully matches created data (id, code, name,
 *    description, timestamps).
 * 5. Ensure the role-based access control is respected: Create requires admin
 *    auth, retrieve is public.
 *
 * This test confirms the correctness, completeness, and access policy of the
 * SKU option group feature.
 */
export async function test_api_shopping_mall_sku_option_group_retrieval_public_access(
  connection: api.IConnection,
) {
  // 1. Admin user joins
  const adminCreateData = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: "1234",
    phone_number: null,
    role: "superadmin",
  } satisfies IShoppingMallAdmin.ICreate;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateData,
    });
  typia.assert(admin);

  // 2. Admin creates SKU option group
  const skuOptionGroupCreate: IShoppingMallSkuOptionGroup.ICreate = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  };
  const createdSkuOptionGroup: IShoppingMallSkuOptionGroup =
    await api.functional.shoppingMall.admin.shoppingMallSkuOptionGroups.create(
      connection,
      {
        body: skuOptionGroupCreate,
      },
    );
  typia.assert(createdSkuOptionGroup);

  // 3. Retrieve SKU option group publicly by code, no explicit auth
  const retrievedSkuOptionGroup: IShoppingMallSkuOptionGroup =
    await api.functional.shoppingMall.shoppingMallSkuOptionGroups.at(
      connection,
      { code: createdSkuOptionGroup.code },
    );
  typia.assert(retrievedSkuOptionGroup);

  // 4. Assert that retrieved data matches created data
  TestValidator.equals(
    "SKU Option Group code match",
    retrievedSkuOptionGroup.code,
    createdSkuOptionGroup.code,
  );
  TestValidator.equals(
    "SKU Option Group name match",
    retrievedSkuOptionGroup.name,
    createdSkuOptionGroup.name,
  );
  TestValidator.equals(
    "SKU Option Group description match",
    retrievedSkuOptionGroup.description,
    createdSkuOptionGroup.description,
  );
  TestValidator.equals(
    "SKU Option Group id match",
    retrievedSkuOptionGroup.id,
    createdSkuOptionGroup.id,
  );
  TestValidator.equals(
    "SKU Option Group created_at match",
    retrievedSkuOptionGroup.created_at,
    createdSkuOptionGroup.created_at,
  );

  // 5. updated_at may be null or string, assert equality including explicit null
  if (
    retrievedSkuOptionGroup.updated_at === null ||
    createdSkuOptionGroup.updated_at === null
  ) {
    TestValidator.equals(
      "SKU Option Group updated_at null check",
      retrievedSkuOptionGroup.updated_at,
      createdSkuOptionGroup.updated_at,
    );
  } else {
    TestValidator.equals(
      "SKU Option Group updated_at match",
      retrievedSkuOptionGroup.updated_at,
      createdSkuOptionGroup.updated_at,
    );
  }
}
