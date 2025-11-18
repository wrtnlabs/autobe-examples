import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCountry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCountry";

/**
 * Validate that an authenticated admin can update mutable fields of an existing
 * country identified by its business country_code, while immutable identifiers
 * remain stable.
 *
 * Business context
 *
 * - Countries are master data in shopping_mall_countries, referenced by business
 *   country_code.
 * - Admins manage countries via admin-only endpoints.
 * - Only name_en, phone_code, is_active, and sort_order are mutable via the
 *   update API.
 *
 * Steps:
 *
 * 1. Admin joins via POST /auth/admin/join to establish an authenticated admin
 *    context.
 * 2. Using that admin session, create a new country via POST
 *    /shoppingMall/admin/countries with a unique country_code and initial
 *    values for mutable fields.
 * 3. Call PUT /shoppingMall/admin/countries/{countryCode} with the same
 *    country_code and an IShoppingMallCountry.IUpdate body that changes all
 *    mutable fields.
 * 4. Assert that:
 *
 *    - The returned IShoppingMallCountry preserves id and country_code.
 *    - Name_en, phone_code, is_active, and sort_order match the update payload.
 *    - Created_at is unchanged compared to the original country.
 *    - Updated_at is different from (and chronologically after or at least not
 *         before) the original updated_at.
 */
export async function test_api_admin_country_update_basic_fields(
  connection: api.IConnection,
) {
  // 1. Admin joins to obtain an authenticated admin context.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create an initial country with a unique test country_code and initial values.
  const countryCode = `DE_UPD_${RandomGenerator.alphaNumeric(8)}`;

  const createBody = {
    country_code: countryCode,
    name_en: `Germany Update Test ${RandomGenerator.alphabets(5)}`,
    phone_code: null,
    is_active: true,
    sort_order: 10 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;

  const created: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: createBody,
    });
  typia.assert<IShoppingMallCountry>(created);

  // Basic invariants after creation
  TestValidator.equals(
    "created country_code should match request payload",
    created.country_code,
    countryCode,
  );
  TestValidator.equals(
    "created name_en should match createBody.name_en",
    created.name_en,
    createBody.name_en,
  );
  TestValidator.equals(
    "created is_active should match createBody.is_active",
    created.is_active,
    createBody.is_active,
  );
  TestValidator.equals(
    "created sort_order should match createBody.sort_order",
    created.sort_order,
    createBody.sort_order,
  );
  TestValidator.equals(
    "created phone_code should match createBody.phone_code (null)",
    created.phone_code ?? null,
    createBody.phone_code ?? null,
  );

  const originalId = created.id;
  const originalCountryCode = created.country_code;
  const originalCreatedAt = created.created_at;
  const originalUpdatedAt = created.updated_at;

  // 3. Update mutable fields via PUT /shoppingMall/admin/countries/{countryCode}.
  const updatedNameEn = `Germany Updated ${RandomGenerator.alphabets(6)}`;
  const updatedPhoneCode = "+49";
  const updatedIsActive = false;
  const updatedSortOrder = 20 as number & tags.Type<"int32">;

  const updateBody = {
    name_en: updatedNameEn,
    phone_code: updatedPhoneCode,
    is_active: updatedIsActive,
    sort_order: updatedSortOrder,
  } satisfies IShoppingMallCountry.IUpdate;

  const updated: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.update(connection, {
      countryCode: originalCountryCode,
      body: updateBody,
    });
  typia.assert<IShoppingMallCountry>(updated);

  // 4. Validate invariants and updated fields.
  // Immutable identifiers remain the same.
  TestValidator.equals(
    "updated id should remain unchanged",
    updated.id,
    originalId,
  );
  TestValidator.equals(
    "updated country_code should remain unchanged",
    updated.country_code,
    originalCountryCode,
  );

  // Mutable fields should reflect the update body.
  TestValidator.equals(
    "updated name_en should match updateBody.name_en",
    updated.name_en,
    updateBody.name_en,
  );
  TestValidator.equals(
    "updated phone_code should match updateBody.phone_code",
    updated.phone_code ?? null,
    updateBody.phone_code ?? null,
  );
  TestValidator.equals(
    "updated is_active should match updateBody.is_active",
    updated.is_active,
    updateBody.is_active,
  );
  TestValidator.equals(
    "updated sort_order should match updateBody.sort_order",
    updated.sort_order,
    updateBody.sort_order,
  );

  // Timestamps: created_at should remain unchanged, updated_at should advance.
  TestValidator.equals(
    "created_at should remain unchanged after update",
    updated.created_at,
    originalCreatedAt,
  );

  TestValidator.predicate(
    "updated_at should be different from original updated_at after update",
    updated.updated_at !== originalUpdatedAt,
  );
}
