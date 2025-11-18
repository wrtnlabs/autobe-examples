import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCountry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCountry";

/**
 * Validate administrator-driven creation of a country master record.
 *
 * Business goal
 *
 * - Ensure that an authenticated admin can onboard a new country into the
 *   shopping mall configuration and that the created country entity is returned
 *   with all mandatory lifecycle fields populated.
 *
 * High-level flow
 *
 * 1. Register a new admin via POST /auth/admin/join, which also issues JWT tokens
 *    and wires them into the connection headers automatically.
 * 2. With the now-authenticated connection, call POST
 *    /shoppingMall/admin/countries with a well-formed
 *    IShoppingMallCountry.ICreate payload.
 * 3. Validate that the API returns an IShoppingMallCountry object whose fields
 *    match the request payload where appropriate and whose lifecycle fields are
 *    properly initialized.
 *
 * Assertions and validations
 *
 * - Type-level: Use typia.assert to confirm the response conforms to
 *   IShoppingMallCountry.
 * - Identity and echoing:
 *
 *   - Id is a valid UUID string (guaranteed by typia.assert format checks).
 *   - Country_code, name_en, is_active, sort_order, and phone_code match the sent
 *       payload (phone_code may be null or a string but must be echoed as
 *       provided).
 * - Lifecycle fields:
 *
 *   - Created_at and updated_at are present, non-empty, and valid ISO date-time
 *       strings (typia.assert covers the format).
 *   - Deleted_at is either undefined or null on freshly created records.
 * - Basic logical sanity:
 *
 *   - Sort_order is the same integer we requested.
 *   - Is_active is true as requested, enabling the new country.
 *
 * Data generation strategy
 *
 * - Admin join payload (IShoppingMallAdminJoin.ICreate):
 *
 *   - Email: use typia.random<string & tags.Format<"email">>().
 *   - Password: use typia.random<string & tags.Format<"password">>().
 *   - Href/referrer: use typia.random<string & tags.Format<"uri">>() for each.
 *   - Ip: explicitly set to null to exercise the nullable branch.
 * - Country create payload (IShoppingMallCountry.ICreate):
 *
 *   - Country_code: generate a short random uppercase code using
 *       RandomGenerator.alphabets and transform to upper-case to resemble ISO
 *       codes and reduce collision risk across runs.
 *   - Name_en: RandomGenerator.paragraph with a small sentence count to simulate a
 *       descriptive label.
 *   - Phone_code: supply a realistic dialing prefix string such as "+82".
 *   - Is_active: true.
 *   - Sort_order: a small positive int32 (e.g., 10).
 *
 * Notes
 *
 * - Do not touch connection.headers directly; rely on the SDK to propagate the
 *   Authorization header when admin.join is called.
 * - Focus on the happy path; error scenarios are out of scope for this single e2e
 *   function.
 */
export async function test_api_country_creation_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin to obtain an authenticated context.
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

  // 2. Prepare a unique, realistic country creation payload.
  const countryCodeSource: string = RandomGenerator.alphabets(3).toUpperCase();
  const countryCreateBody = {
    country_code: countryCodeSource,
    name_en: RandomGenerator.paragraph({ sentences: 3 }),
    phone_code: "+82",
    is_active: true,
    sort_order: 10,
  } satisfies IShoppingMallCountry.ICreate;

  // 3. Call the country creation endpoint as the authenticated admin.
  const createdCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreateBody,
    });

  // 4. Structural type validation using typia.assert.
  typia.assert<IShoppingMallCountry>(createdCountry);

  // 5. Business and echoing validations.
  TestValidator.equals(
    "created country_code should echo the request payload",
    createdCountry.country_code,
    countryCreateBody.country_code,
  );
  TestValidator.equals(
    "created name_en should echo the request payload",
    createdCountry.name_en,
    countryCreateBody.name_en,
  );
  TestValidator.equals(
    "created phone_code should echo the request payload",
    createdCountry.phone_code,
    countryCreateBody.phone_code,
  );
  TestValidator.equals(
    "created is_active should echo the request payload",
    createdCountry.is_active,
    countryCreateBody.is_active,
  );
  TestValidator.equals(
    "created sort_order should echo the request payload",
    createdCountry.sort_order,
    countryCreateBody.sort_order,
  );

  // 6. Lifecycle sanity checks.
  TestValidator.predicate(
    "created country id must be a non-empty string",
    typeof createdCountry.id === "string" && createdCountry.id.length > 0,
  );
  TestValidator.predicate(
    "created_at must be a non-empty string",
    typeof createdCountry.created_at === "string" &&
      createdCountry.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at must be a non-empty string",
    typeof createdCountry.updated_at === "string" &&
      createdCountry.updated_at.length > 0,
  );
  TestValidator.equals(
    "deleted_at of a newly created country should be null or undefined",
    createdCountry.deleted_at ?? null,
    null,
  );
}
