import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallUserNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallUserNotification";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallUserNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserNotification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_user_notifications_retrieval_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate a new customer via join utility function
  const customerConnection: api.IConnection = { host: connection.host };
  const customer: IShoppingMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {});
  customerConnection.headers = {
    ...customerConnection.headers,
    Authorization: customer.token.access,
  };
  // 2. Prepare various filter and pagination combinations
  // a) Basic filter: ownerType = 'customer'
  const baseFilter = {
    ownerType: "customer",
  } satisfies IShoppingMallUserNotification.IRequest;
  // b) Filter by read status: isRead = true/false
  const readFilters = [true, false];
  // c) Filter by deliveredAt range
  const deliveredFrom = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 7 days ago
  const deliveredTo = new Date(
    Date.now() + 1 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 1 day future
  // d) Filter by readAt range
  const readFrom = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 30 days ago
  const readTo = new Date().toISOString(); // now
  // e) Pagination controls
  const pages = [1, 2];
  const limits = [5, 10];
  // f) Sort fields and orders
  const sortFields = ["createdAt", "deliveredAt"];
  const sortOrders: ("asc" | "desc")[] = ["asc", "desc"];
  // g) Search queries - partial substrings from dummy text
  const searchQueries = [
    "notification",
    "update",
    "alert",
    "", // empty search
  ];
  // 3. Run multiple queries with different combinations and validate
  for (const isRead of readFilters) {
    for (const page of pages) {
      for (const limit of limits) {
        for (const sortBy of sortFields) {
          for (const sortOrder of sortOrders) {
            for (const search of searchQueries) {
              // Build request body
              const body: IShoppingMallUserNotification.IRequest = {
                ownerType: baseFilter.ownerType,
                isRead,
                deliveredFrom,
                deliveredTo,
                readFrom,
                readTo,
                page,
                limit,
                sortBy,
                sortOrder,
                search: search.length > 0 ? search : undefined,
              };
              const response =
                await api.functional.shoppingMall.customer.userNotifications.index(
                  customerConnection,
                  { body },
                );
              typia.assert(response);
              // Validate response:
              // - pagination matches requested page and limit
              TestValidator.equals(
                `pagination current page for isRead=${isRead} page=${page} limit=${limit} sortBy=${sortBy} sortOrder=${sortOrder} search=${search}`,
                response.pagination.current,
                page,
              );
              TestValidator.equals(
                `pagination limit for isRead=${isRead} page=${page} limit=${limit} sortBy=${sortBy} sortOrder=${sortOrder} search=${search}`,
                response.pagination.limit,
                limit,
              );
              // - all notifications ownerType matches 'customer'
              for (const notification of response.data) {
                TestValidator.equals(
                  `notification ownerType is 'customer' for isRead=${isRead} page=${page} limit=${limit} sortBy=${sortBy} sortOrder=${sortOrder} search=${search}`,
                  notification.ownerType,
                  "customer",
                );
                // - isRead filter matching if isRead filter is applied
                if (typeof isRead === "boolean") {
                  TestValidator.equals(
                    `notification isRead matches filter for id=${notification.id}`,
                    notification.isRead,
                    isRead,
                  );
                }
                // - search filter: if search string is non-empty, title or body should include substring
                if (search.length > 0) {
                  const lowerSearch = search.toLowerCase();
                  TestValidator.predicate(
                    `notification matches search substring for id=${notification.id}`,
                    notification.title.toLowerCase().includes(lowerSearch) ||
                      notification.body.toLowerCase().includes(lowerSearch),
                  );
                }
              }
              // - pagination pages must respect records and limit, pages is correct
              const expectedPages = Math.ceil(
                response.pagination.records / limit,
              );
              TestValidator.equals(
                `pagination total pages calculated correctly for isRead=${isRead} page=${page} limit=${limit}`,
                response.pagination.pages,
                expectedPages,
              );
              // - sort order check (if data length > 1)
              if (response.data.length > 1) {
                const sortedData = [...response.data];
                const fieldKey =
                  sortBy === "createdAt" ? "createdAt" : "deliveredAt";
                sortedData.sort((a, b) => {
                  const aVal = a[fieldKey];
                  const bVal = b[fieldKey];
                  if (aVal === null) return 1;
                  if (bVal === null) return -1;
                  if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
                  if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
                  return 0;
                });
                TestValidator.equals(
                  `notifications sorted by ${sortBy} ${sortOrder} for isRead=${isRead} page=${page} limit=${limit} search=${search}`,
                  response.data.map((x) => x.id),
                  sortedData.map((x) => x.id),
                );
              }
            }
          }
        }
      }
    }
  }
}
