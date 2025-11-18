import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCountry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCountry";

/**
 * Validate that admin country update supports partial field updates.
 *
 * Business goals:
 *
 * - Ensure that PUT /shoppingMall/admin/countries/{countryCode} using
 *   IShoppingMallCountry.IUpdate only modifies explicitly provided fields.
 * - Confirm that omitted fields on IShoppingMallCountry.IUpdate remain unchanged
 *   (no nulling/reset) after update.
 * - Validate that identity fields (id, country_code) are stable while updated_at
 *   reflects modification time changes.
 *
 * Scenario steps:
 *
 * 1. Admin joins via POST /auth/admin/join and becomes authenticated.
 * 2. Admin creates a baseline country via POST /shoppingMall/admin/countries with
 *    all configurable fields populated.
 * 3. Capture original IShoppingMallCountry snapshot.
 * 4. Perform a partial update that only changes name_en and omits phone_code,
 *    is_active, and sort_order.
 * 5. Assert that the response shows name_en updated, while phone_code, is_active,
 *    and sort_order are unchanged, and id/country_code stable. Also check
 *    updated_at differs from original updated_at.
 * 6. Perform another partial update that only changes phone_code, validating again
 *    that other fields remain unchanged.
 */
export async function test_api_admin_country_update_partial_fields(
  connection: api.IConnection,
) {
  // 1. Admin join (authentication context setup)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: "https://admin.test.local/join",
    referrer: "https://admin.test.local/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create baseline country with full configuration
  const countryCode = `PARTIAL_${RandomGenerator.alphaNumeric(8)}`;

  const createCountryBody = {
    country_code: countryCode,
    name_en: "Partial Update Test Country",
    phone_code: "+99",
    is_active: true,
    sort_order: 100,
  } satisfies IShoppingMallCountry.ICreate;

  const createdCountry: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: createCountryBody,
    });
  typia.assert(createdCountry);

  // Capture original snapshot for comparison
  const originalId = createdCountry.id;
  const originalCountryCode = createdCountry.country_code;
  const originalNameEn = createdCountry.name_en;
  const originalPhoneCode = createdCountry.phone_code ?? null;
  const originalIsActive = createdCountry.is_active;
  const originalSortOrder = createdCountry.sort_order;
  const originalUpdatedAt = createdCountry.updated_at;

  TestValidator.equals(
    "created country_code matches requested",
    createdCountry.country_code,
    countryCode,
  );

  // 4. First partial update: change only name_en
  const updatedNameEn1 = `${originalNameEn} - v2`;
  const firstUpdateBody = {
    name_en: updatedNameEn1,
  } satisfies IShoppingMallCountry.IUpdate;

  const afterFirstUpdate: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.update(connection, {
      countryCode: originalCountryCode,
      body: firstUpdateBody,
    });
  typia.assert(afterFirstUpdate);

  // 5. Assertions: only name_en changed
  TestValidator.equals(
    "id must remain unchanged after first partial update",
    afterFirstUpdate.id,
    originalId,
  );
  TestValidator.equals(
    "country_code must remain unchanged after first partial update",
    afterFirstUpdate.country_code,
    originalCountryCode,
  );
  TestValidator.equals(
    "name_en must be updated after first partial update",
    afterFirstUpdate.name_en,
    updatedNameEn1,
  );
  TestValidator.equals(
    "phone_code must remain unchanged after first partial update",
    afterFirstUpdate.phone_code ?? null,
    originalPhoneCode,
  );
  TestValidator.equals(
    "is_active must remain unchanged after first partial update",
    afterFirstUpdate.is_active,
    originalIsActive,
  );
  TestValidator.equals(
    "sort_order must remain unchanged after first partial update",
    afterFirstUpdate.sort_order,
    originalSortOrder,
  );
  TestValidator.notEquals(
    "updated_at should change after first partial update",
    afterFirstUpdate.updated_at,
    originalUpdatedAt,
  );

  // 6. Second partial update: change only phone_code
  const updatedPhoneCode2 = "+100";
  const secondUpdateBody = {
    phone_code: updatedPhoneCode2,
  } satisfies IShoppingMallCountry.IUpdate;

  const afterSecondUpdate: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.update(connection, {
      countryCode: originalCountryCode,
      body: secondUpdateBody,
    });
  typia.assert(afterSecondUpdate);

  TestValidator.equals(
    "id must remain unchanged after second partial update",
    afterSecondUpdate.id,
    originalId,
  );
  TestValidator.equals(
    "country_code must remain unchanged after second partial update",
    afterSecondUpdate.country_code,
    originalCountryCode,
  );
  TestValidator.equals(
    "name_en must remain as last updated value after second partial update",
    afterSecondUpdate.name_en,
    updatedNameEn1,
  );
  TestValidator.equals(
    "phone_code must be updated after second partial update",
    afterSecondUpdate.phone_code ?? null,
    updatedPhoneCode2,
  );
  TestValidator.equals(
    "is_active must remain unchanged after second partial update",
    afterSecondUpdate.is_active,
    originalIsActive,
  );
  TestValidator.equals(
    "sort_order must remain unchanged after second partial update",
    afterSecondUpdate.sort_order,
    originalSortOrder,
  );
  await TestValidator.predicate(
    "updated_at should move forward after successive partial updates",
    async () => afterSecondUpdate.updated_at >= afterFirstUpdate.updated_at,
  );
}
