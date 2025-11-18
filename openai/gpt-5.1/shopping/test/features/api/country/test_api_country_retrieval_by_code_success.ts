import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCountry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCountry";

/**
 * Validate successful retrieval of a country by its business country_code.
 *
 * Business context:
 *
 * - Country master records are created and managed by administrators via
 *   /shoppingMall/admin/countries.
 * - Public clients read those countries using the business key
 *   /shoppingMall/countries/{countryCode}, not the internal UUID id.
 *
 * This test verifies the happy-path workflow:
 *
 * 1. Admin joins the platform using POST /auth/admin/join to obtain authorization
 *    context.
 * 2. Admin creates a country via POST /shoppingMall/admin/countries with a
 *    specific country_code and attributes.
 * 3. Public GET /shoppingMall/countries/{countryCode} retrieves the country by the
 *    same business key.
 * 4. The retrieved entity's fields (id, country_code, name_en, phone_code,
 *    is_active, sort_order, created_at, updated_at, deleted_at) are
 *    type-correct and consistent with the created record.
 * 5. Repeated retrievals by the same country_code always return consistent data
 *    and do not modify state.
 */
export async function test_api_country_retrieval_by_code_success(
  connection: api.IConnection,
) {
  // 1. Admin joins and obtains authorization context
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
  typia.assert(adminAuthorized);

  // 2. Admin creates a specific country master record
  const countryCode = "US";
  const countryCreateBody = {
    country_code: countryCode,
    name_en: "United States of America",
    phone_code: "+1",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;

  const createdCountry: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreateBody,
    });
  typia.assert(createdCountry);

  // Validate created country fields match the creation payload
  TestValidator.equals(
    "created country_code matches input",
    createdCountry.country_code,
    countryCreateBody.country_code,
  );
  TestValidator.equals(
    "created name_en matches input",
    createdCountry.name_en,
    countryCreateBody.name_en,
  );
  TestValidator.equals(
    "created phone_code matches input",
    createdCountry.phone_code,
    countryCreateBody.phone_code,
  );
  TestValidator.equals(
    "created is_active matches input",
    createdCountry.is_active,
    countryCreateBody.is_active,
  );
  TestValidator.equals(
    "created sort_order matches input",
    createdCountry.sort_order,
    countryCreateBody.sort_order,
  );

  // 3. Retrieve the country by its business country_code using public endpoint
  const firstRetrieved: IShoppingMallCountry =
    await api.functional.shoppingMall.countries.at(connection, {
      countryCode,
    });
  typia.assert(firstRetrieved);

  // Validate retrieval consistency with the created record
  TestValidator.equals(
    "retrieved id matches created id",
    firstRetrieved.id,
    createdCountry.id,
  );
  TestValidator.equals(
    "retrieved country_code matches path parameter",
    firstRetrieved.country_code,
    countryCode,
  );
  TestValidator.equals(
    "retrieved country_code matches created country_code",
    firstRetrieved.country_code,
    createdCountry.country_code,
  );
  TestValidator.equals(
    "retrieved name_en matches created name_en",
    firstRetrieved.name_en,
    createdCountry.name_en,
  );
  TestValidator.equals(
    "retrieved phone_code matches created phone_code",
    firstRetrieved.phone_code,
    createdCountry.phone_code,
  );
  TestValidator.equals(
    "retrieved is_active matches created is_active",
    firstRetrieved.is_active,
    createdCountry.is_active,
  );
  TestValidator.equals(
    "retrieved sort_order matches created sort_order",
    firstRetrieved.sort_order,
    createdCountry.sort_order,
  );

  // 4. Repeated retrievals must be consistent and not modify state
  const secondRetrieved: IShoppingMallCountry =
    await api.functional.shoppingMall.countries.at(connection, {
      countryCode,
    });
  typia.assert(secondRetrieved);

  const thirdRetrieved: IShoppingMallCountry =
    await api.functional.shoppingMall.countries.at(connection, {
      countryCode,
    });
  typia.assert(thirdRetrieved);

  // Compare second retrieval with first.
  TestValidator.equals(
    "second retrieval has same id as first",
    secondRetrieved.id,
    firstRetrieved.id,
  );
  TestValidator.equals(
    "second retrieval has same country_code as first",
    secondRetrieved.country_code,
    firstRetrieved.country_code,
  );
  TestValidator.equals(
    "second retrieval has same name_en as first",
    secondRetrieved.name_en,
    firstRetrieved.name_en,
  );
  TestValidator.equals(
    "second retrieval has same phone_code as first",
    secondRetrieved.phone_code,
    firstRetrieved.phone_code,
  );
  TestValidator.equals(
    "second retrieval has same is_active as first",
    secondRetrieved.is_active,
    firstRetrieved.is_active,
  );
  TestValidator.equals(
    "second retrieval has same sort_order as first",
    secondRetrieved.sort_order,
    firstRetrieved.sort_order,
  );

  // Compare third retrieval with first to ensure idempotent reads.
  TestValidator.equals(
    "third retrieval has same id as first",
    thirdRetrieved.id,
    firstRetrieved.id,
  );
  TestValidator.equals(
    "third retrieval has same country_code as first",
    thirdRetrieved.country_code,
    firstRetrieved.country_code,
  );
  TestValidator.equals(
    "third retrieval has same name_en as first",
    thirdRetrieved.name_en,
    firstRetrieved.name_en,
  );
  TestValidator.equals(
    "third retrieval has same phone_code as first",
    thirdRetrieved.phone_code,
    firstRetrieved.phone_code,
  );
  TestValidator.equals(
    "third retrieval has same is_active as first",
    thirdRetrieved.is_active,
    firstRetrieved.is_active,
  );
  TestValidator.equals(
    "third retrieval has same sort_order as first",
    thirdRetrieved.sort_order,
    firstRetrieved.sort_order,
  );
}
