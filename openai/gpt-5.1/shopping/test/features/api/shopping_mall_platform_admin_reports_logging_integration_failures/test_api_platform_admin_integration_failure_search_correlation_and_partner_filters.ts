import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallLoggingIntegrationFailure } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallLoggingIntegrationFailure";
import type { IShoppingMallLoggingIntegrationFailure } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLoggingIntegrationFailure";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

export async function test_api_platform_admin_integration_failure_search_correlation_and_partner_filters(
  connection: api.IConnection,
) {
  // 1. Join as platform admin to obtain authorized context
  const joinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.shoppingmall.example.com/join",
    referrer: "https://shoppingmall.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Broad integration failure search over a wide time window without
  //    correlationId or partnerIdentifiers to sample incidents
  const now = new Date();
  const from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const to = now.toISOString();

  const broadRequestBody = {
    from,
    to,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 50 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<200>,
    sortBy: "occurred_at" as const,
    sortOrder: "desc" as const,
  } satisfies IShoppingMallLoggingIntegrationFailure.IRequest;

  const broadPage: IPageIShoppingMallLoggingIntegrationFailure.ISummary =
    await api.functional.shoppingMall.platformAdmin.reports.logging.integrationFailures.index(
      connection,
      {
        body: broadRequestBody,
      },
    );
  typia.assert<IPageIShoppingMallLoggingIntegrationFailure.ISummary>(broadPage);

  const pagination: IPage.IPagination = broadPage.pagination;
  typia.assert<IPage.IPagination>(pagination);

  // basic sanity on pagination structure
  TestValidator.predicate(
    "broad search pagination has non-negative values",
    () =>
      pagination.current >= 0 &&
      pagination.limit >= 0 &&
      pagination.records >= 0 &&
      pagination.pages >= 0,
  );

  // branch depending on whether there are any failures at all
  const hasAnyBroadData = broadPage.data.length > 0;

  if (!hasAnyBroadData) {
    // If there is no data at all, we can still validate that querying
    // with a random non-existing correlationId yields an empty result
    const randomCorrelation = typia.random<string & tags.Format<"uuid">>();

    const emptyFilterBody = {
      from,
      to,
      correlationId: randomCorrelation,
      limit: 10 as number &
        tags.Type<"int32"> &
        tags.Minimum<1> &
        tags.Maximum<200>,
    } satisfies IShoppingMallLoggingIntegrationFailure.IRequest;

    const emptyResult: IPageIShoppingMallLoggingIntegrationFailure.ISummary =
      await api.functional.shoppingMall.platformAdmin.reports.logging.integrationFailures.index(
        connection,
        {
          body: emptyFilterBody,
        },
      );
    typia.assert<IPageIShoppingMallLoggingIntegrationFailure.ISummary>(
      emptyResult,
    );

    TestValidator.equals(
      "non-existent correlationId returns empty data when there are no failures",
      emptyResult.data.length,
      0,
    );

    const emptyPagination: IPage.IPagination = emptyResult.pagination;
    typia.assert<IPage.IPagination>(emptyPagination);

    TestValidator.predicate(
      "empty result pagination is coherent when no records",
      () =>
        emptyPagination.records === 0
          ? emptyPagination.pages === 0 && emptyPagination.current === 0
          : true,
    );

    return;
  }

  // 3. Pick a representative incident and derive correlation/partner filters
  const seedSummary: IShoppingMallLoggingIntegrationFailure.ISummary =
    broadPage.data[0];
  typia.assert<IShoppingMallLoggingIntegrationFailure.ISummary>(seedSummary);

  const seedOccurredAt = seedSummary.occurred_at;
  const seedCorrelation = seedSummary.correlation_id;

  // Derive a pseudo partner identifier from provider, as DTO has no dedicated field
  const derivedPartnerIdentifier = seedSummary.provider;

  // Narrower time window around the chosen incident
  const incidentTime = new Date(seedOccurredAt);
  const narrowFrom = new Date(
    incidentTime.getTime() - 60 * 60 * 1000,
  ).toISOString();
  const narrowTo = new Date(
    incidentTime.getTime() + 60 * 60 * 1000,
  ).toISOString();

  const narrowRequestBodyBase = {
    from: narrowFrom,
    to: narrowTo,
    limit: 10 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<200>,
    sortBy: "occurred_at" as const,
    sortOrder: "desc" as const,
  } satisfies IShoppingMallLoggingIntegrationFailure.IRequest;

  // 4. Query with correlationId (if present) and partnerIdentifiers
  if (seedCorrelation !== undefined) {
    const narrowWithPartnerBody = {
      ...narrowRequestBodyBase,
      correlationId: seedCorrelation,
      partnerIdentifiers: [derivedPartnerIdentifier],
    } satisfies IShoppingMallLoggingIntegrationFailure.IRequest;

    const narrowWithPartnerPage: IPageIShoppingMallLoggingIntegrationFailure.ISummary =
      await api.functional.shoppingMall.platformAdmin.reports.logging.integrationFailures.index(
        connection,
        {
          body: narrowWithPartnerBody,
        },
      );
    typia.assert<IPageIShoppingMallLoggingIntegrationFailure.ISummary>(
      narrowWithPartnerPage,
    );

    TestValidator.predicate(
      "narrow filter respects limit upper bound",
      () => narrowWithPartnerPage.data.length <= 10,
    );

    // every item should match correlationId (when defined) and derived partner
    for (const item of narrowWithPartnerPage.data) {
      typia.assert<IShoppingMallLoggingIntegrationFailure.ISummary>(item);
      TestValidator.equals(
        "item correlation_id matches filter",
        item.correlation_id,
        seedCorrelation,
      );
      TestValidator.equals(
        "item provider matches derived partner identifier",
        item.provider,
        derivedPartnerIdentifier,
      );
    }

    // 6. Remove partnerIdentifiers while keeping correlationId and time window
    const narrowWithoutPartnerBody = {
      ...narrowRequestBodyBase,
      correlationId: seedCorrelation,
    } satisfies IShoppingMallLoggingIntegrationFailure.IRequest;

    const narrowWithoutPartnerPage: IPageIShoppingMallLoggingIntegrationFailure.ISummary =
      await api.functional.shoppingMall.platformAdmin.reports.logging.integrationFailures.index(
        connection,
        {
          body: narrowWithoutPartnerBody,
        },
      );
    typia.assert<IPageIShoppingMallLoggingIntegrationFailure.ISummary>(
      narrowWithoutPartnerPage,
    );

    // All items must still share the same correlation_id
    for (const item of narrowWithoutPartnerPage.data) {
      typia.assert<IShoppingMallLoggingIntegrationFailure.ISummary>(item);
      TestValidator.equals(
        "item correlation_id matches filter without partnerIdentifiers",
        item.correlation_id,
        seedCorrelation,
      );
    }

    // Ensure that the broader-by-partner query contains at least the seed incident
    const containsSeedInWithoutPartner = narrowWithoutPartnerPage.data.some(
      (i) => i.id === seedSummary.id,
    );
    TestValidator.predicate(
      "narrow without partnerIdentifiers still includes seed incident",
      containsSeedInWithoutPartner,
    );
  }

  // 5. Non-existent correlationId should yield an empty data array
  const randomCorrelation = typia.random<string & tags.Format<"uuid">>();

  const nonExistingCorrelationBody = {
    from: from,
    to: to,
    correlationId: randomCorrelation,
    limit: 5 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<200>,
  } satisfies IShoppingMallLoggingIntegrationFailure.IRequest;

  const nonExistingCorrelationPage: IPageIShoppingMallLoggingIntegrationFailure.ISummary =
    await api.functional.shoppingMall.platformAdmin.reports.logging.integrationFailures.index(
      connection,
      {
        body: nonExistingCorrelationBody,
      },
    );
  typia.assert<IPageIShoppingMallLoggingIntegrationFailure.ISummary>(
    nonExistingCorrelationPage,
  );

  TestValidator.equals(
    "non-existent correlationId yields empty data array",
    nonExistingCorrelationPage.data.length,
    0,
  );

  const nonExistingPagination: IPage.IPagination =
    nonExistingCorrelationPage.pagination;
  typia.assert<IPage.IPagination>(nonExistingPagination);

  TestValidator.predicate(
    "pagination metadata is coherent for non-existent correlationId",
    () =>
      nonExistingPagination.records === 0
        ? nonExistingPagination.pages === 0 &&
          nonExistingPagination.current === 0
        : true,
  );
}
