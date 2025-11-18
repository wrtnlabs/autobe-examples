import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCountry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCountry";

export async function test_api_admin_country_deactivation_and_reactivation(
  connection: api.IConnection,
) {
  /** 1. Register an admin and establish authenticated context */
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  /** 2. Create a new active country as admin */
  const baseCountryCode = `CT${RandomGenerator.alphabets(2).toUpperCase()}`;
  const originalNameEn = RandomGenerator.name(2);
  const originalSortOrder = typia.random<number & tags.Type<"int32">>();

  const createBody = {
    country_code: baseCountryCode,
    name_en: originalNameEn,
    phone_code: `+${RandomGenerator.alphaNumeric(2)}`,
    is_active: true,
    sort_order: originalSortOrder,
  } satisfies IShoppingMallCountry.ICreate;

  const createdCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: createBody,
    });
  typia.assert<IShoppingMallCountry>(createdCountry);

  // Preserve original immutable and mutable fields for comparison
  const originalId = createdCountry.id;
  const originalCountryCode = createdCountry.country_code;
  const originalCreatedAt = createdCountry.created_at;
  const originalUpdatedAt = createdCountry.updated_at;
  const originalPhoneCode = createdCountry.phone_code ?? null;
  const originalDeletedAt = createdCountry.deleted_at ?? null;

  TestValidator.equals(
    "initial country should be active",
    createdCountry.is_active,
    true,
  );
  TestValidator.equals(
    "created country_code matches requested code",
    createdCountry.country_code,
    baseCountryCode,
  );
  TestValidator.equals(
    "created name_en matches requested name",
    createdCountry.name_en,
    originalNameEn,
  );
  TestValidator.equals(
    "created sort_order matches requested sort_order",
    createdCountry.sort_order,
    originalSortOrder,
  );

  /** 3. Deactivate the country using update endpoint */
  const deactivateBody = {
    is_active: false,
  } satisfies IShoppingMallCountry.IUpdate;

  const deactivatedCountry =
    await api.functional.shoppingMall.admin.countries.update(connection, {
      countryCode: originalCountryCode,
      body: deactivateBody,
    });
  typia.assert<IShoppingMallCountry>(deactivatedCountry);

  // Business assertions after deactivation
  TestValidator.equals(
    "id must remain unchanged after deactivation",
    deactivatedCountry.id,
    originalId,
  );
  TestValidator.equals(
    "country_code must remain unchanged after deactivation",
    deactivatedCountry.country_code,
    originalCountryCode,
  );
  TestValidator.equals(
    "created_at must remain unchanged after deactivation",
    deactivatedCountry.created_at,
    originalCreatedAt,
  );
  TestValidator.notEquals(
    "updated_at must change after deactivation",
    deactivatedCountry.updated_at,
    originalUpdatedAt,
  );
  TestValidator.equals(
    "is_active should be false after deactivation",
    deactivatedCountry.is_active,
    false,
  );
  TestValidator.equals(
    "sort_order remains unchanged when not updated",
    deactivatedCountry.sort_order,
    originalSortOrder,
  );
  TestValidator.equals(
    "name_en remains unchanged when not updated",
    deactivatedCountry.name_en,
    originalNameEn,
  );
  TestValidator.equals(
    "phone_code remains unchanged when not updated",
    deactivatedCountry.phone_code ?? null,
    originalPhoneCode,
  );
  TestValidator.equals(
    "deleted_at must remain unchanged and not be affected by updates",
    deactivatedCountry.deleted_at ?? null,
    originalDeletedAt,
  );

  /** 4. Reactivate the country and alter other mutable fields */
  const reactivatedNameEn = `${originalNameEn}-reactivated`;
  const reactivatedSortOrderNumber =
    (deactivatedCountry.sort_order as number) + 1;
  const reactivatedSortOrder =
    reactivatedSortOrderNumber satisfies number as number;

  const reactivateBody = {
    is_active: true,
    name_en: reactivatedNameEn,
    sort_order: reactivatedSortOrder,
  } satisfies IShoppingMallCountry.IUpdate;

  const reactivatedCountry =
    await api.functional.shoppingMall.admin.countries.update(connection, {
      countryCode: originalCountryCode,
      body: reactivateBody,
    });
  typia.assert<IShoppingMallCountry>(reactivatedCountry);

  // Business assertions after reactivation
  TestValidator.equals(
    "id must remain unchanged after reactivation",
    reactivatedCountry.id,
    originalId,
  );
  TestValidator.equals(
    "country_code must remain unchanged after reactivation",
    reactivatedCountry.country_code,
    originalCountryCode,
  );
  TestValidator.equals(
    "created_at must remain unchanged after reactivation",
    reactivatedCountry.created_at,
    originalCreatedAt,
  );
  TestValidator.notEquals(
    "updated_at must change again after reactivation",
    reactivatedCountry.updated_at,
    deactivatedCountry.updated_at,
  );
  TestValidator.equals(
    "is_active should be true after reactivation",
    reactivatedCountry.is_active,
    true,
  );
  TestValidator.equals(
    "name_en should match the new reactivated value",
    reactivatedCountry.name_en,
    reactivatedNameEn,
  );
  TestValidator.equals(
    "sort_order should match the new reactivated value",
    reactivatedCountry.sort_order,
    reactivatedSortOrder,
  );
  TestValidator.equals(
    "phone_code must remain unchanged across updates",
    reactivatedCountry.phone_code ?? null,
    originalPhoneCode,
  );
  TestValidator.equals(
    "deleted_at must remain unchanged across all updates",
    reactivatedCountry.deleted_at ?? null,
    originalDeletedAt,
  );
}
