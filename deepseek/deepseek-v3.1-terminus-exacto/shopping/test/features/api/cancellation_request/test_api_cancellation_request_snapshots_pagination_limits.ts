import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationRequestSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCancellationRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_cancellation_request_snapshots_pagination_limits(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // Use a valid cancellation request ID that might exist in the system
  // Since we cannot create cancellation requests through available APIs,
  // we'll work with whatever data the system has
  const cancellationRequestId = typia.random<string & tags.Format<"uuid">>();
  // Test different limit values
  const limitValues = [1, 5, 10, 25, 50, 100] as const;
  for (const limit of limitValues) {
    // Test first page with the given limit
    const firstPage =
      await api.functional.ecommerce.administrator.cancellation_requests.snapshots.index(
        adminConnection,
        {
          cancellationRequestId,
          body: {
            page: 1,
            limit: limit,
          } satisfies IEcommerceCancellationRequestSnapshot.IRequest,
        },
      );
    typia.assert(firstPage);
    // Validate pagination metadata consistency
    TestValidator.equals(
      `limit ${limit} - current page is 1`,
      firstPage.pagination.current,
      1,
    );
    TestValidator.equals(
      `limit ${limit} - limit matches request`,
      firstPage.pagination.limit,
      limit,
    );
    TestValidator.predicate(
      `limit ${limit} - records count non-negative`,
      firstPage.pagination.records >= 0,
    );
    TestValidator.predicate(
      `limit ${limit} - pages count non-negative`,
      firstPage.pagination.pages >= 0,
    );
    // Validate that pages calculation is correct
    if (firstPage.pagination.records > 0) {
      const expectedPages = Math.ceil(firstPage.pagination.records / limit);
      TestValidator.equals(
        `limit ${limit} - pages calculation correct`,
        firstPage.pagination.pages,
        expectedPages,
      );
    }
    // Test last page if we have multiple pages
    if (firstPage.pagination.pages > 1) {
      const lastPage =
        await api.functional.ecommerce.administrator.cancellation_requests.snapshots.index(
          adminConnection,
          {
            cancellationRequestId,
            body: {
              page: firstPage.pagination.pages,
              limit: limit,
            } satisfies IEcommerceCancellationRequestSnapshot.IRequest,
          },
        );
      typia.assert(lastPage);
      TestValidator.equals(
        `limit ${limit} - last page current`,
        lastPage.pagination.current,
        firstPage.pagination.pages,
      );
      TestValidator.equals(
        `limit ${limit} - last page records consistent`,
        lastPage.pagination.records,
        firstPage.pagination.records,
      );
      TestValidator.equals(
        `limit ${limit} - last page pages consistent`,
        lastPage.pagination.pages,
        firstPage.pagination.pages,
      );
    }
    // Test page beyond total pages
    const beyondPage =
      await api.functional.ecommerce.administrator.cancellation_requests.snapshots.index(
        adminConnection,
        {
          cancellationRequestId,
          body: {
            page: firstPage.pagination.pages + 1,
            limit: limit,
          } satisfies IEcommerceCancellationRequestSnapshot.IRequest,
        },
      );
    typia.assert(beyondPage);
    // Beyond page should have empty data but consistent pagination metadata
    TestValidator.equals(
      `limit ${limit} - beyond page current`,
      beyondPage.pagination.current,
      firstPage.pagination.pages + 1,
    );
    TestValidator.equals(
      `limit ${limit} - beyond page records consistent`,
      beyondPage.pagination.records,
      firstPage.pagination.records,
    );
    TestValidator.equals(
      `limit ${limit} - beyond page pages consistent`,
      beyondPage.pagination.pages,
      firstPage.pagination.pages,
    );
  }
  // Test default behavior (no limit specified)
  const defaultPage =
    await api.functional.ecommerce.administrator.cancellation_requests.snapshots.index(
      adminConnection,
      {
        cancellationRequestId,
        body: {
          page: 1,
          // limit intentionally omitted to test default
        } satisfies IEcommerceCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(defaultPage);
  // Default page should have valid pagination
  TestValidator.predicate(
    "default page has positive limit",
    defaultPage.pagination.limit > 0,
  );
  TestValidator.predicate(
    "default page has valid current page",
    defaultPage.pagination.current === 1,
  );
  TestValidator.predicate(
    "default page has non-negative records",
    defaultPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "default page has non-negative pages",
    defaultPage.pagination.pages >= 0,
  );
}
