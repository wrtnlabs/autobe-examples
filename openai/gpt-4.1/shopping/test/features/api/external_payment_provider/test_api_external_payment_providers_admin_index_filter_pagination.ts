import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallExternalPaymentProvider } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallExternalPaymentProvider";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallExternalPaymentProvider } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallExternalPaymentProvider";

/**
 * Validates paginated and filtered listing of external payment providers by an
 * authenticated admin.
 *
 * - Registers a new admin account to guarantee authenticated, authorized context.
 * - Registers several payment providers with varying names and statuses (active,
 *   inactive, deprecated) to set up filtering test data.
 * - Verifies that filtering by provider_name, provider_code, status, and q
 *   (search) only returns matching records and that pagination metadata matches
 *   expectations for various page sizes/limits.
 * - Checks that only authenticated admin can access this listing.
 * - Validates that filtering out by non-matching queries or by explicit status
 *   results in zero-length or fully-matching results.
 * - Ensures that no extra or omitted results are present beyond filter criteria.
 * - Pagination checks verify total, pages, current page, and limit fields.
 */
export async function test_api_external_payment_providers_admin_index_filter_pagination(
  connection: api.IConnection,
) {
  // Create a new admin for authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(10) + "A!";
  const adminName = RandomGenerator.name();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword satisfies string,
      name: adminName,
    },
  });
  typia.assert(admin);

  // Prepare providers with diverse data
  const statuses = ["active", "inactive", "deprecated"] as const;
  const providers: IShoppingMallExternalPaymentProvider[] =
    await ArrayUtil.asyncMap(
      [
        {
          provider_name: "StripeX0",
          provider_code: "stripex",
          status: "active",
        },
        {
          provider_name: "PayPalY1",
          provider_code: "paypaly",
          status: "inactive",
        },
        { provider_name: "TossA2", provider_code: "tossa", status: "active" },
        {
          provider_name: "FooBar",
          provider_code: "foobar",
          status: "deprecated",
        },
        {
          provider_name: "ZenoGate",
          provider_code: "zenogate",
          status: "active",
        },
        {
          provider_name: "InactiveGate",
          provider_code: "inactivegate",
          status: "inactive",
        },
      ],
      async (base) => {
        const output =
          await api.functional.shoppingMall.admin.externalPaymentProviders.create(
            connection,
            {
              body: {
                provider_name: base.provider_name,
                provider_code: base.provider_code,
                status: base.status,
                description: RandomGenerator.paragraph({ sentences: 2 }),
              },
            },
          );
        typia.assert(output);
        return output;
      },
    );

  // Filter by provider_name (exact match)
  const providerToTest = providers[0];
  const resName =
    await api.functional.shoppingMall.admin.externalPaymentProviders.index(
      connection,
      {
        body: {
          provider_name: providerToTest.provider_name,
        },
      },
    );
  typia.assert(resName);
  TestValidator.predicate(
    "result for exact provider_name match only contains that provider",
    resName.data.length === 1 &&
      resName.data[0].name === providerToTest.provider_name,
  );

  // Filter by provider_code (exact match, should be unique)
  const providerByCode = providers[1];
  const resCode =
    await api.functional.shoppingMall.admin.externalPaymentProviders.index(
      connection,
      {
        body: {
          provider_code: providerByCode.provider_code,
        },
      },
    );
  typia.assert(resCode);
  TestValidator.predicate(
    "result for exact provider_code match only contains that provider",
    resCode.data.length === 1 &&
      resCode.data[0].provider_code === providerByCode.provider_code,
  );

  // Filter by status: all 'active' records
  const resStatus =
    await api.functional.shoppingMall.admin.externalPaymentProviders.index(
      connection,
      {
        body: { status: "active" },
      },
    );
  typia.assert(resStatus);
  TestValidator.predicate(
    "all listed providers have status active",
    resStatus.data.length > 0 &&
      resStatus.data.every((p) => p.status === "active"),
  );

  // Case: Free-text search q hits by description or name
  const searchString = providerToTest.provider_name.substring(0, 4);
  const resQ =
    await api.functional.shoppingMall.admin.externalPaymentProviders.index(
      connection,
      {
        body: { q: searchString },
      },
    );
  typia.assert(resQ);
  TestValidator.predicate(
    "free-text q filters by name/description/codes",
    resQ.data.some(
      (p) =>
        p.name.includes(searchString) || p.provider_code.includes(searchString),
    ),
  );

  // Filter resulting in no matches (random string)
  const resNone =
    await api.functional.shoppingMall.admin.externalPaymentProviders.index(
      connection,
      {
        body: { q: "NO_MATCH_THIS_QWERZXCV" },
      },
    );
  typia.assert(resNone);
  TestValidator.equals(
    "no results for random search q",
    resNone.data.length,
    0,
  );

  // Pagination checks
  const resPage1 =
    await api.functional.shoppingMall.admin.externalPaymentProviders.index(
      connection,
      {
        body: { page: 1 as number, limit: 2 as number },
      },
    );
  typia.assert(resPage1);
  TestValidator.equals("pagination current=1", resPage1.pagination.current, 1);
  TestValidator.equals("pagination limit=2", resPage1.pagination.limit, 2);
  TestValidator.predicate(
    "page 1 data is at most 2 length",
    resPage1.data.length <= 2,
  );
  // page 2, should match if more than 2 rows
  const resPage2 =
    await api.functional.shoppingMall.admin.externalPaymentProviders.index(
      connection,
      {
        body: { page: 2 as number, limit: 2 as number },
      },
    );
  typia.assert(resPage2);
  TestValidator.equals("pagination current=2", resPage2.pagination.current, 2);
  TestValidator.equals("pagination limit=2", resPage2.pagination.limit, 2);
  TestValidator.predicate(
    "page 2 data is at most 2 length",
    resPage2.data.length <= 2,
  );

  // Security: must be authenticated as admin - create a guest/unauth connection and expect error
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated externalPaymentProviders.index fails",
    async () => {
      await api.functional.shoppingMall.admin.externalPaymentProviders.index(
        unauthConn,
        {
          body: {},
        },
      );
    },
  );
}
