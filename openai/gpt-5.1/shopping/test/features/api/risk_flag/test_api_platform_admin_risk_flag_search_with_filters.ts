import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRiskFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRiskFlag";
import type { IShoppingMallAuthCredentials } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthCredentials";
import type { IShoppingMallAuthCredentialsActor } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthCredentialsActor";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallRiskFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskFlag";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate platform admin risk flag search with filters and pagination.
 *
 * This scenario verifies that a platform administrator can:
 *
 * 1. Join as a new platform admin and obtain an authorized session.
 * 2. Seed multiple risk flags for a specific authentication credential id.
 * 3. Search those risk flags with pagination, filtering by code (types), and
 *    ordering.
 * 4. Observe that changing filter parameters returns different subsets and
 *    pagination metadata.
 * 5. Ensure that unauthenticated connections cannot call the search endpoint.
 */
export async function test_api_platform_admin_risk_flag_search_with_filters(
  connection: api.IConnection,
) {
  // 1. Join as platform administrator
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Prepare a concrete authCredentialsId and seed multiple risk flags
  const authCredentialsId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Define distinct risk flag codes and categories to filter on later
  const codeHigh = "high_risk_login";
  const codeMedium = "medium_risk_payment";
  const codeLow = "low_risk_behavior";

  const categoryFraud = "suspected_fraud";
  const categoryAbuse = "abuse_reports";

  // Create three flags with varying properties
  const flag1: IShoppingMallRiskFlag =
    await api.functional.shoppingMall.platformAdmin.authCredentials.riskFlags.create(
      connection,
      {
        authCredentialsId,
        body: {
          code: codeHigh,
          reasonCategory: categoryFraud,
          riskLevel: "critical",
          message: RandomGenerator.paragraph({ sentences: 3 }),
          active: true,
          expiresAt: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          notes: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IShoppingMallRiskFlag.ICreate,
      },
    );
  typia.assert(flag1);

  const flag2: IShoppingMallRiskFlag =
    await api.functional.shoppingMall.platformAdmin.authCredentials.riskFlags.create(
      connection,
      {
        authCredentialsId,
        body: {
          code: codeMedium,
          reasonCategory: categoryFraud,
          riskLevel: "high",
          message: RandomGenerator.paragraph({ sentences: 3 }),
          active: true,
          expiresAt: null,
          notes: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IShoppingMallRiskFlag.ICreate,
      },
    );
  typia.assert(flag2);

  const flag3: IShoppingMallRiskFlag =
    await api.functional.shoppingMall.platformAdmin.authCredentials.riskFlags.create(
      connection,
      {
        authCredentialsId,
        body: {
          code: codeLow,
          reasonCategory: categoryAbuse,
          riskLevel: "low",
          message: RandomGenerator.paragraph({ sentences: 3 }),
          active: false,
          expiresAt: null,
          notes: null,
        } satisfies IShoppingMallRiskFlag.ICreate,
      },
    );
  typia.assert(flag3);

  const allSeeded: IShoppingMallRiskFlag[] = [flag1, flag2, flag3];

  // 3. First search: filter by two codes and paginate with limit 2, order by created_at desc
  const firstRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
    orderBy: "created_at",
    orderDirection: "desc" as "desc",
    types: [codeHigh, codeMedium],
  } satisfies IShoppingMallRiskFlag.IRequest;

  const firstPage: IPageIShoppingMallRiskFlag.ISummary =
    await api.functional.shoppingMall.platformAdmin.authCredentials.riskFlags.index(
      connection,
      {
        authCredentialsId,
        body: firstRequestBody,
      },
    );
  typia.assert(firstPage);

  const firstPagination = firstPage.pagination;
  const firstData = firstPage.data;

  // Basic pagination sanity checks
  TestValidator.predicate(
    "first page current index is non-negative",
    firstPagination.current >= 0,
  );
  TestValidator.predicate(
    "first page limit is positive",
    firstPagination.limit > 0,
  );
  TestValidator.predicate(
    "records count is at least returned data length",
    firstPagination.records >= firstData.length,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    firstPagination.pages >= 0,
  );

  // All returned items should belong to our authCredentialsId and map back to seeded flags
  for (const summary of firstData) {
    TestValidator.equals(
      "summary shopping_mall_auth_credentials_id matches authCredentialsId",
      summary.shopping_mall_auth_credentials_id,
      authCredentialsId,
    );
    TestValidator.predicate(
      "summary id corresponds to a seeded flag whose code is in requested types",
      allSeeded
        .filter((f) => (firstRequestBody.types ?? []).includes(f.code))
        .some((f) => f.id === summary.id),
    );
  }

  // Verify created_at is in non-increasing order
  for (let i = 1; i < firstData.length; i++) {
    const prev = new Date(firstData[i - 1].created_at).getTime();
    const curr = new Date(firstData[i].created_at).getTime();
    TestValidator.predicate(
      "created_at is ordered desc across first page data",
      prev >= curr,
    );
  }

  // 4. Second search: change filters to target only one code to produce different subset
  const secondRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 5 as number & tags.Type<"int32"> & tags.Minimum<1>,
    orderBy: "created_at",
    orderDirection: "desc" as "desc",
    types: [codeHigh],
  } satisfies IShoppingMallRiskFlag.IRequest;

  const secondPage: IPageIShoppingMallRiskFlag.ISummary =
    await api.functional.shoppingMall.platformAdmin.authCredentials.riskFlags.index(
      connection,
      {
        authCredentialsId,
        body: secondRequestBody,
      },
    );
  typia.assert(secondPage);

  const secondPagination = secondPage.pagination;
  const secondData = secondPage.data;

  // Pagination sanity for second call
  TestValidator.predicate(
    "second page current index is non-negative",
    secondPagination.current >= 0,
  );
  TestValidator.predicate(
    "second page limit is positive",
    secondPagination.limit > 0,
  );

  // All returned items should be subset of seeded flags with codeHigh
  const highCodeIds = allSeeded
    .filter((f) => f.code === codeHigh)
    .map((f) => f.id);

  for (const summary of secondData) {
    TestValidator.equals(
      "second page summary shopping_mall_auth_credentials_id matches authCredentialsId",
      summary.shopping_mall_auth_credentials_id,
      authCredentialsId,
    );
    TestValidator.predicate(
      "second page summary id is from high risk code flags",
      highCodeIds.includes(summary.id),
    );
  }

  // Ensure that changing filters yields different subsets in typical case
  TestValidator.predicate(
    "changing types filter yields different subset or size",
    firstData.length !== secondData.length ||
      firstData.some(
        (item) => !secondData.some((other) => other.id === item.id),
      ),
  );

  // 5. Negative test: unauthenticated connection cannot call index successfully
  const unauthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthenticated connection should not be able to search risk flags",
    async () => {
      await api.functional.shoppingMall.platformAdmin.authCredentials.riskFlags.index(
        unauthConnection,
        {
          authCredentialsId,
          body: firstRequestBody,
        },
      );
    },
  );
}
