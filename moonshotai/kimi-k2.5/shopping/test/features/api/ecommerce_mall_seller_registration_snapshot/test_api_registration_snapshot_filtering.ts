import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
import type { IEcommerceMallSellerRegistrationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistrationSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerRegistration";
import type { IPageIEcommerceMallSellerRegistrationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerRegistrationSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_registration_snapshot_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller to obtain access tokens
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorizedSeller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    },
  });
  typia.assert(authorizedSeller);
  // 2. List seller's registrations to obtain registrationId
  const registrations =
    await api.functional.ecommerceMall.seller.registrations.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallSellerRegistration.IRequest,
      },
    );
  typia.assert(registrations);
  // Get the first registration ID for testing
  const registrationId = registrations.data[0]?.id;
  if (!registrationId) {
    // If no registration exists, we skip the snapshot test or create expectations
    return;
  }
  // 3. Test snapshot filtering without date filters
  const baseRequest: IEcommerceMallSellerRegistrationSnapshot.IRequest = {
    adminId: null,
    createdAtFrom: null,
    createdAtTo: null,
    page: 1,
    limit: 20,
    sort: null,
  };
  const allSnapshots =
    await api.functional.ecommerceMall.seller.registrations.snapshots.index(
      sellerConnection,
      {
        registrationId,
        body: baseRequest,
      },
    );
  typia.assert(allSnapshots);
  // 4. Test pagination with page parameter
  if (allSnapshots.pagination.records > 0) {
    const page1Result =
      await api.functional.ecommerceMall.seller.registrations.snapshots.index(
        sellerConnection,
        {
          registrationId,
          body: {
            ...baseRequest,
            page: 1,
            limit: 5,
          } satisfies IEcommerceMallSellerRegistrationSnapshot.IRequest,
        },
      );
    typia.assert(page1Result);
    const page2Result =
      await api.functional.ecommerceMall.seller.registrations.snapshots.index(
        sellerConnection,
        {
          registrationId,
          body: {
            ...baseRequest,
            page: 2,
            limit: 5,
          } satisfies IEcommerceMallSellerRegistrationSnapshot.IRequest,
        },
      );
    typia.assert(page2Result);
    // Validate pagination metadata
    TestValidator.predicate(
      "first page has correct limit",
      page1Result.pagination.limit === 5,
    );
    TestValidator.predicate(
      "second page has correct limit",
      page2Result.pagination.limit === 5,
    );
  }
  // 5. Test sorting - created_at_desc
  const descSortResult =
    await api.functional.ecommerceMall.seller.registrations.snapshots.index(
      sellerConnection,
      {
        registrationId,
        body: {
          ...baseRequest,
          sort: "created_at_desc",
        } satisfies IEcommerceMallSellerRegistrationSnapshot.IRequest,
      },
    );
  typia.assert(descSortResult);
  if (descSortResult.data.length > 1) {
    TestValidator.predicate(
      "created_at_desc sort orders correctly",
      new Date(descSortResult.data[0]!.createdAt).getTime() >=
        new Date(descSortResult.data[1]!.createdAt).getTime(),
    );
  }
  // 6. Test sorting - created_at_asc
  const ascSortResult =
    await api.functional.ecommerceMall.seller.registrations.snapshots.index(
      sellerConnection,
      {
        registrationId,
        body: {
          ...baseRequest,
          sort: "created_at_asc",
        } satisfies IEcommerceMallSellerRegistrationSnapshot.IRequest,
      },
    );
  typia.assert(ascSortResult);
  if (ascSortResult.data.length > 1) {
    TestValidator.predicate(
      "created_at_asc sort orders correctly",
      new Date(ascSortResult.data[0]!.createdAt).getTime() <=
        new Date(ascSortResult.data[1]!.createdAt).getTime(),
    );
  }
  // 7. Test date range filter - createdAtFrom and createdAtTo
  const now = new Date();
  const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const dateFilteredResult =
    await api.functional.ecommerceMall.seller.registrations.snapshots.index(
      sellerConnection,
      {
        registrationId,
        body: {
          ...baseRequest,
          createdAtFrom: oneYearAgo.toISOString(),
          createdAtTo: oneMonthAgo.toISOString(),
        } satisfies IEcommerceMallSellerRegistrationSnapshot.IRequest,
      },
    );
  typia.assert(dateFilteredResult);
  // Validate that filtered results are within the date range
  if (dateFilteredResult.data.length > 0) {
    const fromTime = oneYearAgo.getTime();
    const toTime = oneMonthAgo.getTime();
    TestValidator.predicate(
      "all filtered snapshots are within date range",
      dateFilteredResult.data.every(
        (snapshot) =>
          new Date(snapshot.createdAt).getTime() >= fromTime &&
          new Date(snapshot.createdAt).getTime() <= toTime,
      ),
    );
  }
  // 8. Test combined filtering with pagination and sorting
  const combinedResult =
    await api.functional.ecommerceMall.seller.registrations.snapshots.index(
      sellerConnection,
      {
        registrationId,
        body: {
          adminId: null,
          createdAtFrom: oneYearAgo.toISOString(),
          createdAtTo: now.toISOString(),
          page: 1,
          limit: 10,
          sort: "created_at_desc" as const,
        } satisfies IEcommerceMallSellerRegistrationSnapshot.IRequest,
      },
    );
  typia.assert(combinedResult);
  TestValidator.predicate(
    "combined result has valid pagination",
    combinedResult.pagination.current === 1 &&
      combinedResult.pagination.limit === 10,
  );
  // 9. Test limit boundary - ensure records are minimized correctly
  const limitedResult =
    await api.functional.ecommerceMall.seller.registrations.snapshots.index(
      sellerConnection,
      {
        registrationId,
        body: {
          ...baseRequest,
          page: 1,
          limit: 2,
        } satisfies IEcommerceMallSellerRegistrationSnapshot.IRequest,
      },
    );
  typia.assert(limitedResult);
  TestValidator.predicate(
    "limited result respects page limit",
    limitedResult.data.length <= 2,
  );
}
