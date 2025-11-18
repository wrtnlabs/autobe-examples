import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCountry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCountry";

/**
 * Validate that an inactive country can be hard-deleted by an authenticated
 * admin.
 *
 * Business flow:
 *
 * 1. Register and authenticate an admin via POST /auth/admin/join.
 * 2. Using the admin session, create an inactive country via POST
 *    /shoppingMall/admin/countries.
 * 3. Hard-delete the inactive country via DELETE
 *    /shoppingMall/admin/countries/{countryCode}.
 * 4. Attempt a second deletion for the same country_code and expect an error,
 *    confirming that the first delete physically removed the record and that
 *    subsequent deletes fail for non-existent country codes.
 *
 * Notes:
 *
 * - Public GET /shoppingMall/countries/{countryCode} is not available in the SDK,
 *   so we validate deletion by the failure of a second erase call instead of a
 *   follow-up GET.
 * - Authorization headers are managed automatically by the SDK after the join
 *   call.
 */
export async function test_api_admin_country_hard_delete_for_inactive_country(
  connection: api.IConnection,
) {
  // 1. Admin registration & authentication
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: "https://admin.shoppingmall.example.com/join",
    referrer: "https://admin.shoppingmall.example.com/",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create an inactive country as this admin
  const countryCode: string = `TEST-${RandomGenerator.alphaNumeric(8)}`;

  const createCountryBody = {
    country_code: countryCode,
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    phone_code: "+99",
    is_active: false,
    sort_order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IShoppingMallCountry.ICreate;

  const createdCountry: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: createCountryBody,
    });
  typia.assert<IShoppingMallCountry>(createdCountry);

  // Basic field validations on created country
  TestValidator.equals(
    "created country_code should match request",
    createdCountry.country_code,
    countryCode,
  );
  TestValidator.equals(
    "created country should be inactive",
    createdCountry.is_active,
    false,
  );

  // 3. Hard-delete the inactive country
  await api.functional.shoppingMall.admin.countries.erase(connection, {
    countryCode,
  });

  // 4. Validate deletion by expecting an error on second delete attempt
  await TestValidator.error(
    "second hard-delete on same country_code should fail",
    async () => {
      await api.functional.shoppingMall.admin.countries.erase(connection, {
        countryCode,
      });
    },
  );
}
