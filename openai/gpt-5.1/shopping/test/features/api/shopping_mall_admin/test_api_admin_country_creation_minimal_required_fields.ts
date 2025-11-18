import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCountry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCountry";

/**
 * Validate minimal required field country creation by an authenticated admin.
 *
 * Business workflow:
 *
 * 1. Register a new admin using POST /auth/admin/join, which also establishes an
 *    authenticated admin context and sets Authorization header via SDK.
 * 2. With this admin context, call POST /shoppingMall/admin/countries with only
 *    the minimal required fields in IShoppingMallCountry.ICreate:
 *
 *    - Country_code: unique business identifier string
 *    - Name_en: English display name
 *    - Is_active: true
 *    - Sort_order: reasonable int32 value
 *    - Phone_code: intentionally omitted to rely on its optionality
 * 3. Assert that the response is a valid IShoppingMallCountry object via
 *    typia.assert and that key business fields mirror the request payload.
 * 4. Perform lightweight business validations such as non-empty UUID id,
 *    created_at <= updated_at, phone_code being null/undefined on creation, and
 *    deleted_at being null/undefined.
 */
export async function test_api_admin_country_creation_minimal_required_fields(
  connection: api.IConnection,
) {
  // 1. Register a new admin via POST /auth/admin/join
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: "https://admin.test.local/join", // valid URI
    referrer: "https://admin.test.local/landing", // valid URI
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(authorizedAdmin);

  // 2. Prepare minimal country creation payload (omit optional phone_code)
  const countryCodeBase = "CA_TEST_";
  const countryCodeSuffix = RandomGenerator.alphaNumeric(6);
  const sortOrder = typia.random<number & tags.Type<"int32">>();

  const countryCreateBody = {
    country_code: `${countryCodeBase}${countryCodeSuffix}`,
    name_en: "Canada Test Country",
    is_active: true,
    sort_order: sortOrder,
  } satisfies IShoppingMallCountry.ICreate;

  // 3. Call POST /shoppingMall/admin/countries
  const createdCountry: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreateBody,
    });
  typia.assert(createdCountry);

  // 4. Business-field validation
  // 4-1. Ensure id is a non-empty UUID (typia.assert already validates format,
  //      but we can still check non-empty semantics and echo consistency).
  TestValidator.predicate(
    "created country id should be a non-empty string",
    typeof createdCountry.id === "string" && createdCountry.id.length > 0,
  );

  // 4-2. Request vs response field equality checks
  TestValidator.equals(
    "country_code should match request payload",
    createdCountry.country_code,
    countryCreateBody.country_code,
  );
  TestValidator.equals(
    "name_en should match request payload",
    createdCountry.name_en,
    countryCreateBody.name_en,
  );
  TestValidator.equals(
    "is_active should match request payload",
    createdCountry.is_active,
    countryCreateBody.is_active,
  );
  TestValidator.equals(
    "sort_order should match request payload",
    createdCountry.sort_order,
    countryCreateBody.sort_order,
  );

  // 4-3. Optional phone_code should be null or undefined when omitted
  TestValidator.predicate(
    "phone_code should be null or undefined when omitted in request",
    createdCountry.phone_code === null ||
      createdCountry.phone_code === undefined,
  );

  // 4-4. deleted_at should be null or undefined on creation
  TestValidator.predicate(
    "deleted_at should be null or undefined on initial creation",
    createdCountry.deleted_at === null ||
      createdCountry.deleted_at === undefined,
  );

  // 4-5. created_at and updated_at should be valid ISO date-time strings and
  //      created_at must not be after updated_at.
  const createdAtTime = new Date(createdCountry.created_at).getTime();
  const updatedAtTime = new Date(createdCountry.updated_at).getTime();

  TestValidator.predicate(
    "created_at should be a valid date-time string",
    Number.isFinite(createdAtTime),
  );
  TestValidator.predicate(
    "updated_at should be a valid date-time string",
    Number.isFinite(updatedAtTime),
  );
  TestValidator.predicate(
    "created_at should be less than or equal to updated_at",
    createdAtTime <= updatedAtTime,
  );
}
