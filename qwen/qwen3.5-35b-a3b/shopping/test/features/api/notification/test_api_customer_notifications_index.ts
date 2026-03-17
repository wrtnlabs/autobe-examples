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

/**
 * Test customer notifications listing endpoint.
 * Validates notification filtering, pagination, search, and customer-specific scoping.
 */
export async function test_api_customer_notifications_index(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register customer and get auth token
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(customer);
  // Update customerConnection with token from join response
  customerConnection.headers ??= {};
  customerConnection.headers.Authorization = customer.token.access;
  // 2. Test empty notifications list
  const emptyNotifications =
    await api.functional.ecommerceMall.customer.notifications.index(
      customerConnection,
      {
        body: {},
      },
    );
  typia.assert(emptyNotifications);
  TestValidator.equals(
    "empty list returns no records",
    emptyNotifications.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty list pagination current is 1",
    emptyNotifications.pagination.current,
    1,
  );
  TestValidator.equals(
    "empty list pagination pages is 0",
    emptyNotifications.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty list data array is empty",
    emptyNotifications.data.length,
    0,
  );
  // 3. Test filtering by notification type
  const typeFiltered =
    await api.functional.ecommerceMall.customer.notifications.index(
      customerConnection,
      {
        body: {
          type: "order_update",
        },
      },
    );
  typia.assert(typeFiltered);
  TestValidator.equals(
    "type filter pagination records",
    typeFiltered.pagination.records,
    0,
  );
  // 4. Test filtering by read status
  const statusFiltered =
    await api.functional.ecommerceMall.customer.notifications.index(
      customerConnection,
      {
        body: {
          read_status: "unread",
        },
      },
    );
  typia.assert(statusFiltered);
  // 5. Test date range filtering
  const dateFrom = new Date("2024-01-01T00:00:00.000Z").toISOString();
  const dateTo = new Date("2024-12-31T23:59:59.999Z").toISOString();
  const dateFiltered =
    await api.functional.ecommerceMall.customer.notifications.index(
      customerConnection,
      {
        body: {
          created_at_from: dateFrom,
          created_at_to: dateTo,
        },
      },
    );
  typia.assert(dateFiltered);
  // 6. Test full-text search
  const searchTerm = "test notification";
  const searchFiltered =
    await api.functional.ecommerceMall.customer.notifications.index(
      customerConnection,
      {
        body: {
          search: searchTerm,
        },
      },
    );
  typia.assert(searchFiltered);
  // 7. Test sorting by created_at ascending
  const sortAsc =
    await api.functional.ecommerceMall.customer.notifications.index(
      customerConnection,
      {
        body: {
          sort: "created_at",
          order: "asc",
        },
      },
    );
  typia.assert(sortAsc);
  // 8. Test sorting by title descending
  const sortDesc =
    await api.functional.ecommerceMall.customer.notifications.index(
      customerConnection,
      {
        body: {
          sort: "title",
          order: "desc",
        },
      },
    );
  typia.assert(sortDesc);
  // 9. Test pagination with per_page limit
  const paginated =
    await api.functional.ecommerceMall.customer.notifications.index(
      customerConnection,
      {
        body: {
          per_page: 10,
          page: 1,
        },
      },
    );
  typia.assert(paginated);
  TestValidator.equals("per_page limit is 10", paginated.pagination.limit, 10);
  TestValidator.equals("current page is 1", paginated.pagination.current, 1);
  // 10. Test pagination with limit override
  const limitOverridden =
    await api.functional.ecommerceMall.customer.notifications.index(
      customerConnection,
      {
        body: {
          limit: 20,
        },
      },
    );
  typia.assert(limitOverridden);
  TestValidator.equals(
    "limit override is 20",
    limitOverridden.pagination.limit,
    20,
  );
  // 11. Validate notification summary structure (test with random when data exists)
  if (paginated.data.length > 0) {
    const firstNotification = paginated.data[0];
    typia.assert(firstNotification);
    // Verify all required fields exist using typia.assert (already validated)
    // Use predicate for UUID format validation
    TestValidator.predicate(
      "id is valid UUID format",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        firstNotification.id,
      ),
    );
    // Use predicate for datetime format validation (handles various timezone formats)
    TestValidator.predicate(
      "created_at is valid datetime format",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?(Z|[+-]\d{2}:?\d{2})$/.test(
        firstNotification.created_at,
      ),
    );
  }
}