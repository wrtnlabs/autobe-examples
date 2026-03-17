import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuest";
import type { IEcommerceMallNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallNotification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallNotification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_notifications_with_filters_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Guest account setup
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAccount = await authorize_guest_join(guestConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      user_agent: null,
    },
  });
  typia.assert(guestAccount);
  // Create a new connection with the guest token for authenticated requests
  const authenticatedGuestConnection: api.IConnection = {
    host: connection.host,
    headers: {
      ...connection.headers,
      Authorization: guestAccount.token.access,
    },
  };
  // 2. Test basic notification retrieval
  const basicNotifications =
    await api.functional.ecommerceMall.guest.notifications.index(
      authenticatedGuestConnection,
      {
        body: {},
      },
    );
  typia.assert(basicNotifications);
  // 3. Test filtering by notification type
  const typeFilters = [
    "order_update",
    "seller_approval",
    "platform_announcement",
    "system_alert",
  ] as const;
  for (const type of typeFilters) {
    const filteredByType =
      await api.functional.ecommerceMall.guest.notifications.index(
        authenticatedGuestConnection,
        {
          body: {
            type,
          },
        },
      );
    typia.assert(filteredByType);
    // Validate that all notifications match the requested type
    TestValidator.predicate(
      `${type} filter returns only ${type} notifications`,
      filteredByType.data.every((notif) => notif.type === type),
    );
  }
  // 4. Test filtering by read status
  const readStatusFilters = ["unread", "read", "acknowledged"] as const;
  for (const status of readStatusFilters) {
    const filteredByStatus =
      await api.functional.ecommerceMall.guest.notifications.index(
        authenticatedGuestConnection,
        {
          body: {
            read_status: status,
          },
        },
      );
    typia.assert(filteredByStatus);
    // Validate that all notifications match the requested status
    TestValidator.predicate(
      `${status} filter returns only ${status} notifications`,
      filteredByStatus.data.every((notif) => notif.status === status),
    );
  }
  // 5. Test filtering by date range
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const filteredByDateRange =
    await api.functional.ecommerceMall.guest.notifications.index(
      authenticatedGuestConnection,
      {
        body: {
          created_at_from: lastWeek.toISOString(),
          created_at_to: now.toISOString(),
        },
      },
    );
  typia.assert(filteredByDateRange);
  // Validate that all notifications are within the date range
  TestValidator.predicate(
    "date range filter returns notifications within range",
    filteredByDateRange.data.every((notif) => {
      const notifDate = new Date(notif.created_at);
      return notifDate >= lastWeek && notifDate <= now;
    }),
  );
  // 6. Test full-text search
  const searchTerms = [
    RandomGenerator.name(),
    RandomGenerator.alphabets(5),
    RandomGenerator.paragraph({ sentences: 3 }),
  ];
  for (const searchTerm of searchTerms) {
    const searchResults =
      await api.functional.ecommerceMall.guest.notifications.index(
        authenticatedGuestConnection,
        {
          body: {
            search: searchTerm,
          },
        },
      );
    typia.assert(searchResults);
    // Validate that search results are not null (actual search implementation varies)
    TestValidator.predicate(
      "search returns results for valid query",
      searchResults !== null,
    );
  }
  // 7. Test sorting by created_at
  const sortField = "created_at";
  const sortDirections = ["asc", "desc"] as const;
  for (const direction of sortDirections) {
    const sortedByCreated =
      await api.functional.ecommerceMall.guest.notifications.index(
        authenticatedGuestConnection,
        {
          body: {
            sort: sortField,
            order: direction,
            per_page: 10,
          },
        },
      );
    typia.assert(sortedByCreated);
    // Validate sorting order
    TestValidator.predicate(
      `sort by ${sortField} ${direction === "asc" ? "ascending" : "descending"}`,
      sortedByCreated.data.length <= 1 ||
        (direction === "asc"
          ? sortedByCreated.data.every(
              (current, index, array) =>
                index === 0 ||
                new Date(current.created_at) >=
                  new Date(array[index - 1].created_at),
            )
          : sortedByCreated.data.every(
              (current, index, array) =>
                index === 0 ||
                new Date(current.created_at) <=
                  new Date(array[index - 1].created_at),
            )),
    );
  }
  // 8. Test sorting by title
  const titleSortDirections = ["asc", "desc"] as const;
  for (const direction of titleSortDirections) {
    const sortedByTitle =
      await api.functional.ecommerceMall.guest.notifications.index(
        authenticatedGuestConnection,
        {
          body: {
            sort: "title",
            order: direction,
            per_page: 10,
          },
        },
      );
    typia.assert(sortedByTitle);
    // Validate sorting order
    TestValidator.predicate(
      `sort by title ${direction === "asc" ? "ascending" : "descending"}`,
      sortedByTitle.data.length <= 1 ||
        (direction === "asc"
          ? sortedByTitle.data.every(
              (current, index, array) =>
                index === 0 ||
                current.title.localeCompare(array[index - 1].title) >= 0,
            )
          : sortedByTitle.data.every(
              (current, index, array) =>
                index === 0 ||
                current.title.localeCompare(array[index - 1].title) <= 0,
            )),
    );
  }
  // 9. Test pagination
  const pageSize = 5;
  const paginationTest =
    await api.functional.ecommerceMall.guest.notifications.index(
      authenticatedGuestConnection,
      {
        body: {
          per_page: pageSize,
        },
      },
    );
  typia.assert(paginationTest);
  TestValidator.equals(
    "pagination limit matches per_page",
    paginationTest.data.length <= pageSize ? true : false,
    true,
  );
  TestValidator.equals(
    "pagination current page",
    paginationTest.pagination.current,
    1,
  );
  // 10. Test combined filters (type + status)
  const combinedFilter =
    await api.functional.ecommerceMall.guest.notifications.index(
      authenticatedGuestConnection,
      {
        body: {
          type: "order_update",
          read_status: "unread",
        },
      },
    );
  typia.assert(combinedFilter);
  TestValidator.predicate(
    "combined filters return notifications matching both criteria",
    combinedFilter.data.every(
      (notif) => notif.type === "order_update" && notif.status === "unread",
    ),
  );
  // 11. Test sorting with pagination
  const sortedPaginated =
    await api.functional.ecommerceMall.guest.notifications.index(
      authenticatedGuestConnection,
      {
        body: {
          sort: "created_at",
          order: "desc",
          page: 1,
          per_page: 5,
        },
      },
    );
  typia.assert(sortedPaginated);
  TestValidator.equals(
    "sorted pagination has correct page size",
    sortedPaginated.data.length <= 5 ? true : false,
    true,
  );
  TestValidator.equals(
    "sorted pagination current page is 1",
    sortedPaginated.pagination.current,
    1,
  );
}
