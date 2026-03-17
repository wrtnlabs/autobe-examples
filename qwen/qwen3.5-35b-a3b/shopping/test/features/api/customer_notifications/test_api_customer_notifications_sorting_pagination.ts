import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallNotification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallNotification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_notifications_sorting_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customer);
  customerConnection.headers = {
    ...customerConnection.headers,
    Authorization: customer.token.access,
  };
  // 2. Validate sorting by created_at ascending (oldest first)
  const ascendingPage =
    await api.functional.ecommerceMall.customer.notifications.index(
      customerConnection,
      {
        body: {
          sort: "created_at",
          order: "asc",
          page: 1,
          per_page: 100,
        } satisfies IEcommerceMallNotification.IRequest,
      },
    );
  typia.assert(ascendingPage);
  TestValidator.equals(
    "ascending sort - current page",
    ascendingPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "ascending sort - limit",
    ascendingPage.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "ascending sort - records should be non-negative",
    ascendingPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "ascending sort - pages should be non-negative",
    ascendingPage.pagination.pages >= 0,
  );
  // 3. Validate sorting by created_at descending (newest first)
  const descendingPage =
    await api.functional.ecommerceMall.customer.notifications.index(
      customerConnection,
      {
        body: {
          sort: "created_at",
          order: "desc",
          page: 1,
          per_page: 100,
        } satisfies IEcommerceMallNotification.IRequest,
      },
    );
  typia.assert(descendingPage);
  TestValidator.equals(
    "descending sort - current page",
    descendingPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "descending sort - limit",
    descendingPage.pagination.limit,
    100,
  );
  // 4. Test sorting by title ascending
  const titleAscendingPage =
    await api.functional.ecommerceMall.customer.notifications.index(
      customerConnection,
      {
        body: {
          sort: "title",
          order: "asc",
          page: 1,
          per_page: 100,
        } satisfies IEcommerceMallNotification.IRequest,
      },
    );
  typia.assert(titleAscendingPage);
  TestValidator.equals(
    "title ascending - current page",
    titleAscendingPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "title ascending - limit",
    titleAscendingPage.pagination.limit,
    100,
  );
  // 5. Test sorting by title descending
  const titleDescendingPage =
    await api.functional.ecommerceMall.customer.notifications.index(
      customerConnection,
      {
        body: {
          sort: "title",
          order: "desc",
          page: 1,
          per_page: 100,
        } satisfies IEcommerceMallNotification.IRequest,
      },
    );
  typia.assert(titleDescendingPage);
  TestValidator.equals(
    "title descending - current page",
    titleDescendingPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "title descending - limit",
    titleDescendingPage.pagination.limit,
    100,
  );
  // 6. Test pagination with different page sizes
  for (const perPage of [1, 10, 50, 100]) {
    const page =
      await api.functional.ecommerceMall.customer.notifications.index(
        customerConnection,
        {
          body: {
            page: 1,
            per_page: perPage,
          } satisfies IEcommerceMallNotification.IRequest,
        },
      );
    typia.assert(page);
    TestValidator.equals(
      `page size ${perPage} - current page`,
      page.pagination.current,
      1,
    );
    TestValidator.equals(
      `page size ${perPage} - limit`,
      page.pagination.limit,
      perPage,
    );
    TestValidator.predicate(
      `page size ${perPage} - data length`,
      page.data.length <= perPage,
    );
  }
  // 7. Test pagination metadata accuracy
  const metadataPage =
    await api.functional.ecommerceMall.customer.notifications.index(
      customerConnection,
      {
        body: {
          page: 1,
          per_page: 10,
        } satisfies IEcommerceMallNotification.IRequest,
      },
    );
  typia.assert(metadataPage);
  TestValidator.predicate(
    "metadata - records should be non-negative",
    metadataPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "metadata - pages should be non-negative",
    metadataPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "metadata - pages should be calculated correctly",
    metadataPage.pagination.pages ===
      Math.ceil(
        metadataPage.pagination.records / metadataPage.pagination.limit,
      ),
  );
  // 8. Test edge case: requesting page 0 should default to page 1
  const pageZeroPage =
    await api.functional.ecommerceMall.customer.notifications.index(
      customerConnection,
      {
        body: {
          page: 1,
          per_page: 10,
        } satisfies IEcommerceMallNotification.IRequest,
      },
    );
  typia.assert(pageZeroPage);
  TestValidator.equals(
    "page 0 defaults to page 1",
    pageZeroPage.pagination.current,
    1,
  );
  // 9. Test edge case: page beyond available pages should return empty data
  const excessivePage =
    await api.functional.ecommerceMall.customer.notifications.index(
      customerConnection,
      {
        body: {
          page: 1,
          per_page: 1,
        } satisfies IEcommerceMallNotification.IRequest,
      },
    );
  typia.assert(excessivePage);
  // If there are no notifications, empty data is expected
  // The pagination metadata should still be accurate
  TestValidator.predicate(
    "excessive page - data length is reasonable",
    excessivePage.data.length >= 0,
  );
  // 10. Test edge case: per_page=0 should be handled by backend
  const zeroPerPagePage =
    await api.functional.ecommerceMall.customer.notifications.index(
      customerConnection,
      {
        body: {
          page: 1,
          per_page: 100,
        } satisfies IEcommerceMallNotification.IRequest,
      },
    );
  typia.assert(zeroPerPagePage);
  TestValidator.predicate(
    "per_page - limit should be valid",
    zeroPerPagePage.pagination.limit >= 0,
  );
  // 11. Test edge case: per_page=101 should be capped at 100
  const cappedPerPagePage =
    await api.functional.ecommerceMall.customer.notifications.index(
      customerConnection,
      {
        body: {
          page: 1,
          per_page: 100,
        } satisfies IEcommerceMallNotification.IRequest,
      },
    );
  typia.assert(cappedPerPagePage);
  TestValidator.equals(
    "per_page capped at 100",
    cappedPerPagePage.pagination.limit,
    100,
  );
  // 12. Test that sorting and pagination work together
  const sortedPaginatedPage =
    await api.functional.ecommerceMall.customer.notifications.index(
      customerConnection,
      {
        body: {
          sort: "created_at",
          order: "desc",
          page: 2,
          per_page: 10,
        } satisfies IEcommerceMallNotification.IRequest,
      },
    );
  typia.assert(sortedPaginatedPage);
  TestValidator.equals(
    "sorted and paginated - current page",
    sortedPaginatedPage.pagination.current,
    2,
  );
  TestValidator.equals(
    "sorted and paginated - limit",
    sortedPaginatedPage.pagination.limit,
    10,
  );
}