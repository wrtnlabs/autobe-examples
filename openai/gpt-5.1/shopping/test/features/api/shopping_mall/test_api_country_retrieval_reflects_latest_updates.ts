import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCountry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCountry";

/**
 * Validate that country retrieval always reflects the latest admin updates.
 *
 * Business flow:
 *
 * 1. Register an admin via POST /auth/admin/join to obtain an authorized admin
 *    context.
 * 2. As admin, create a country via POST /shoppingMall/admin/countries.
 * 3. Publicly retrieve the country via GET /shoppingMall/countries/{countryCode}
 *    and verify that the response matches the created country data.
 * 4. As admin, update the country via PUT
 *    /shoppingMall/admin/countries/{countryCode} changing name_en, phone_code,
 *    is_active and sort_order.
 * 5. Retrieve the country again via GET /shoppingMall/countries/{countryCode} and
 *    verify that:
 *
 *    - Mutable fields reflect the updated values.
 *    - Immutable fields (id, country_code, created_at) are unchanged.
 *    - Updated_at has advanced.
 * 6. Repeat the update+GET sequence once more with different values to ensure that
 *    the retrieval endpoint is not caching stale data and always returns the
 *    latest persisted configuration.
 */
export async function test_api_country_retrieval_reflects_latest_updates(
  connection: api.IConnection,
) {
  // 1. Register an admin (POST /auth/admin/join)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.test.example.com/join",
    referrer: "https://admin.test.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);
  typia.assert<IAuthorizationToken>(adminAuthorized.token);

  // 2. Create a country via admin API
  const countryCode = "KR";

  const createBody = {
    country_code: countryCode,
    name_en: "Korea",
    phone_code: "+82",
    is_active: true,
    sort_order: 10 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;

  const createdCountry: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: createBody,
    });
  typia.assert(createdCountry);

  // 3. Publicly retrieve the country via GET /shoppingMall/countries/{countryCode}
  const firstRetrieved: IShoppingMallCountry =
    await api.functional.shoppingMall.countries.at(connection, {
      countryCode,
    });
  typia.assert(firstRetrieved);

  // Basic consistency between created and first retrieved
  TestValidator.equals(
    "id of created and first retrieved country should match",
    firstRetrieved.id,
    createdCountry.id,
  );
  TestValidator.equals(
    "country_code of created and first retrieved country should match",
    firstRetrieved.country_code,
    createdCountry.country_code,
  );
  TestValidator.equals(
    "name_en of created and first retrieved country should match",
    firstRetrieved.name_en,
    createdCountry.name_en,
  );
  TestValidator.equals(
    "phone_code of created and first retrieved country should match",
    firstRetrieved.phone_code ?? null,
    createdCountry.phone_code ?? null,
  );
  TestValidator.equals(
    "is_active of created and first retrieved country should match",
    firstRetrieved.is_active,
    createdCountry.is_active,
  );
  TestValidator.equals(
    "sort_order of created and first retrieved country should match",
    firstRetrieved.sort_order,
    createdCountry.sort_order,
  );

  // Capture immutable identifiers and timestamps
  const immutableId = firstRetrieved.id;
  const immutableCountryCode = firstRetrieved.country_code;
  const createdAt = firstRetrieved.created_at;
  const firstUpdatedAt = firstRetrieved.updated_at;

  // 4. Admin updates the country (first update)
  const firstUpdateBody = {
    name_en: "Republic of Korea",
    phone_code: "+82-1",
    is_active: false,
    sort_order: 20 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.IUpdate;

  const afterFirstUpdate: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.update(connection, {
      countryCode,
      body: firstUpdateBody,
    });
  typia.assert(afterFirstUpdate);

  // Verify admin update response reflects new values and keeps identifiers
  TestValidator.equals(
    "admin update response should preserve id",
    afterFirstUpdate.id,
    immutableId,
  );
  TestValidator.equals(
    "admin update response should preserve country_code",
    afterFirstUpdate.country_code,
    immutableCountryCode,
  );
  TestValidator.equals(
    "admin update response should preserve created_at",
    afterFirstUpdate.created_at,
    createdAt,
  );
  TestValidator.equals(
    "admin update response should apply updated name_en",
    afterFirstUpdate.name_en,
    firstUpdateBody.name_en,
  );
  TestValidator.equals(
    "admin update response should apply updated phone_code",
    afterFirstUpdate.phone_code ?? null,
    firstUpdateBody.phone_code ?? null,
  );
  TestValidator.equals(
    "admin update response should apply updated is_active",
    afterFirstUpdate.is_active,
    firstUpdateBody.is_active,
  );
  TestValidator.equals(
    "admin update response should apply updated sort_order",
    afterFirstUpdate.sort_order,
    firstUpdateBody.sort_order!,
  );

  TestValidator.predicate(
    "updated_at after first admin update should be greater than or equal to first retrieved updated_at",
    new Date(afterFirstUpdate.updated_at).getTime() >=
      new Date(firstUpdatedAt).getTime(),
  );

  // 5. Retrieve again via public GET and verify it reflects updated values
  const secondRetrieved: IShoppingMallCountry =
    await api.functional.shoppingMall.countries.at(connection, {
      countryCode,
    });
  typia.assert(secondRetrieved);

  TestValidator.equals(
    "second retrieval should preserve id",
    secondRetrieved.id,
    immutableId,
  );
  TestValidator.equals(
    "second retrieval should preserve country_code",
    secondRetrieved.country_code,
    immutableCountryCode,
  );
  TestValidator.equals(
    "second retrieval should preserve created_at",
    secondRetrieved.created_at,
    createdAt,
  );
  TestValidator.equals(
    "second retrieval should reflect first updated name_en",
    secondRetrieved.name_en,
    firstUpdateBody.name_en,
  );
  TestValidator.equals(
    "second retrieval should reflect first updated phone_code",
    secondRetrieved.phone_code ?? null,
    firstUpdateBody.phone_code ?? null,
  );
  TestValidator.equals(
    "second retrieval should reflect first updated is_active",
    secondRetrieved.is_active,
    firstUpdateBody.is_active,
  );
  TestValidator.equals(
    "second retrieval should reflect first updated sort_order",
    secondRetrieved.sort_order,
    firstUpdateBody.sort_order!,
  );

  TestValidator.predicate(
    "updated_at in second retrieval should be greater than or equal to first retrieval",
    new Date(secondRetrieved.updated_at).getTime() >=
      new Date(firstUpdatedAt).getTime(),
  );

  const secondUpdatedAt = secondRetrieved.updated_at;

  // 6. Second update to verify no caching and monotonic updated_at
  const secondUpdateBody = {
    name_en: "Korea (Final)",
    phone_code: "+82-2",
    is_active: true,
    sort_order: 30 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.IUpdate;

  const afterSecondUpdate: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.update(connection, {
      countryCode,
      body: secondUpdateBody,
    });
  typia.assert(afterSecondUpdate);

  TestValidator.predicate(
    "updated_at after second admin update should be greater than or equal to second retrieval updated_at",
    new Date(afterSecondUpdate.updated_at).getTime() >=
      new Date(secondUpdatedAt).getTime(),
  );

  const thirdRetrieved: IShoppingMallCountry =
    await api.functional.shoppingMall.countries.at(connection, {
      countryCode,
    });
  typia.assert(thirdRetrieved);

  // Final assertions to confirm latest state is returned
  TestValidator.equals(
    "third retrieval should preserve id",
    thirdRetrieved.id,
    immutableId,
  );
  TestValidator.equals(
    "third retrieval should preserve country_code",
    thirdRetrieved.country_code,
    immutableCountryCode,
  );
  TestValidator.equals(
    "third retrieval should preserve created_at",
    thirdRetrieved.created_at,
    createdAt,
  );
  TestValidator.equals(
    "third retrieval should reflect second updated name_en",
    thirdRetrieved.name_en,
    secondUpdateBody.name_en,
  );
  TestValidator.equals(
    "third retrieval should reflect second updated phone_code",
    thirdRetrieved.phone_code ?? null,
    secondUpdateBody.phone_code ?? null,
  );
  TestValidator.equals(
    "third retrieval should reflect second updated is_active",
    thirdRetrieved.is_active,
    secondUpdateBody.is_active,
  );
  TestValidator.equals(
    "third retrieval should reflect second updated sort_order",
    thirdRetrieved.sort_order,
    secondUpdateBody.sort_order!,
  );

  TestValidator.predicate(
    "updated_at in third retrieval should be greater than or equal to second retrieval",
    new Date(thirdRetrieved.updated_at).getTime() >=
      new Date(secondUpdatedAt).getTime(),
  );
}
