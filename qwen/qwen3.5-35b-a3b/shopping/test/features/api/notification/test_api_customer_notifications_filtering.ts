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

export async function test_api_customer_notifications_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a new customer for isolated testing context
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      href: "http://localhost:3000/register",
      referrer: "http://localhost:3000/",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Test filtering by notification type
  const typeFilter = "order_update";
  const typeFilteredNotifications =
    await api.functional.ecommerceMall.customer.notifications.index(
      customerConnection,
      {
        body: {
          type: typeFilter,
          per_page: 100,
        } satisfies IEcommerceMallNotification.IRequest,
      },
    );
  typia.assert(typeFilteredNotifications);
  TestValidator.predicate(
    "type filter pagination metadata present",
    typeFilteredNotifications.pagination.records >= 0,
  );
  // 3. Test filtering by read status
  const statusFilter = "unread";
  const statusFilteredNotifications =
    await api.functional.ecommerceMall.customer.notifications.index(
      customerConnection,
      {
        body: {
          read_status: statusFilter,
          per_page: 100,
        } satisfies IEcommerceMallNotification.IRequest,
      },
    );
  typia.assert(statusFilteredNotifications);
  TestValidator.predicate(
    "status filter pagination metadata present",
    statusFilteredNotifications.pagination.records >= 0,
  );
  // 4. Test combined filtering (type AND status)
  const combinedFilterNotifications =
    await api.functional.ecommerceMall.customer.notifications.index(
      customerConnection,
      {
        body: {
          type: typeFilter,
          read_status: statusFilter,
          per_page: 100,
        } satisfies IEcommerceMallNotification.IRequest,
      },
    );
  typia.assert(combinedFilterNotifications);
  TestValidator.predicate(
    "combined filter pagination metadata present",
    combinedFilterNotifications.pagination.records >= 0,
  );
  // 5. Test date range filtering
  const now = new Date();
  const createdAtFrom = new Date(
    now.getTime() - 24 * 60 * 60 * 1000,
  ).toISOString(); // 1 day ago
  const createdAtTo = new Date().toISOString();
  const dateRangeNotifications =
    await api.functional.ecommerceMall.customer.notifications.index(
      customerConnection,
      {
        body: {
          created_at_from: createdAtFrom,
          created_at_to: createdAtTo,
          per_page: 100,
        } satisfies IEcommerceMallNotification.IRequest,
      },
    );
  typia.assert(dateRangeNotifications);
  TestValidator.predicate(
    "date range filter pagination metadata present",
    dateRangeNotifications.pagination.records >= 0,
  );
  // 6. Test full-text search
  const searchQuery = "order";
  const searchNotifications =
    await api.functional.ecommerceMall.customer.notifications.index(
      customerConnection,
      {
        body: {
          search: searchQuery,
          per_page: 100,
        } satisfies IEcommerceMallNotification.IRequest,
      },
    );
  typia.assert(searchNotifications);
  TestValidator.predicate(
    "search filter pagination metadata present",
    searchNotifications.pagination.records >= 0,
  );
  // 7. Test edge case: no matching results (contradictory criteria)
  const noResultsNotifications =
    await api.functional.ecommerceMall.customer.notifications.index(
      customerConnection,
      {
        body: {
          type: "order_update",
          read_status: "acknowledged",
          search: "nonexistent_notification_term_xyz",
          per_page: 100,
        } satisfies IEcommerceMallNotification.IRequest,
      },
    );
  typia.assert(noResultsNotifications);
  TestValidator.equals(
    "no results pagination records",
    noResultsNotifications.pagination.records,
    0,
  );
  TestValidator.equals(
    "no results data array empty",
    noResultsNotifications.data.length,
    0,
  );
  // 8. Test edge case: broad criteria (should return all matching)
  const broadCriteriaNotifications =
    await api.functional.ecommerceMall.customer.notifications.index(
      customerConnection,
      {
        body: {
          per_page: 100,
        } satisfies IEcommerceMallNotification.IRequest,
      },
    );
  typia.assert(broadCriteriaNotifications);
  TestValidator.predicate(
    "broad criteria pagination metadata present",
    broadCriteriaNotifications.pagination.records >= 0,
  );
  // 9. Validate all pagination structures have required fields
  TestValidator.predicate(
    "type filter has valid current page",
    typeFilteredNotifications.pagination.current >= 0,
  );
  TestValidator.predicate(
    "type filter has valid limit",
    typeFilteredNotifications.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "type filter has valid total pages",
    typeFilteredNotifications.pagination.pages >= 0,
  );
}
