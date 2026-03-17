import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallNotification";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallNotification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_notifications_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(seller);
  // 2. Get seller's notifications without filters (all notifications)
  const allNotifications =
    await api.functional.ecommerceMall.seller.notifications.index(
      sellerConnection,
      {
        body: {},
      },
    );
  typia.assert(allNotifications);
  // 3. Test filtering by notification type 'seller_approval'
  const approvalNotifications =
    await api.functional.ecommerceMall.seller.notifications.index(
      sellerConnection,
      {
        body: {
          type: "seller_approval",
        },
      },
    );
  typia.assert(approvalNotifications);
  // 4. Test filtering by read_status 'unread'
  const unreadNotifications =
    await api.functional.ecommerceMall.seller.notifications.index(
      sellerConnection,
      {
        body: {
          read_status: "unread",
        },
      },
    );
  typia.assert(unreadNotifications);
  // 5. Test filtering by date range
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const dateRangeNotifications =
    await api.functional.ecommerceMall.seller.notifications.index(
      sellerConnection,
      {
        body: {
          created_at_from: oneWeekAgo.toISOString(),
          created_at_to: now.toISOString(),
        },
      },
    );
  typia.assert(dateRangeNotifications);
  // 6. Test full-text search with meaningful text
  const searchNotifications =
    await api.functional.ecommerceMall.seller.notifications.index(
      sellerConnection,
      {
        body: {
          search: "approval",
        },
      },
    );
  typia.assert(searchNotifications);
  // 7. Test sorting by created_at descending
  const sortedNotifications =
    await api.functional.ecommerceMall.seller.notifications.index(
      sellerConnection,
      {
        body: {
          sort: "created_at",
          order: "desc",
        },
      },
    );
  typia.assert(sortedNotifications);
  // 8. Test pagination with limit
  const paginatedNotifications =
    await api.functional.ecommerceMall.seller.notifications.index(
      sellerConnection,
      {
        body: {
          page: 1,
          per_page: 10,
        },
      },
    );
  typia.assert(paginatedNotifications);
  // 9. Validate pagination metadata
  TestValidator.equals(
    "pagination current page is 1",
    paginatedNotifications.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 10",
    paginatedNotifications.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    paginatedNotifications.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    paginatedNotifications.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records <= limit * pages",
    paginatedNotifications.pagination.records <=
      paginatedNotifications.pagination.limit *
        paginatedNotifications.pagination.pages,
  );
  // 10. Validate notification data structure
  TestValidator.predicate(
    "all notifications have valid UUID ids",
    allNotifications.data.every((n) =>
      /^\{?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\}?$/i.test(
        n.id,
      ),
    ),
  );
  TestValidator.predicate(
    "all notifications have non-empty titles",
    allNotifications.data.every((n) => n.title.length > 0),
  );
  TestValidator.predicate(
    "all notifications have non-empty bodies",
    allNotifications.data.every((n) => n.body.length > 0),
  );
  TestValidator.predicate(
    "all notifications have valid type",
    allNotifications.data.every((n) =>
      [
        "order_update",
        "seller_approval",
        "platform_announcement",
        "system_alert",
      ].includes(n.type),
    ),
  );
  TestValidator.predicate(
    "all notifications have valid status",
    allNotifications.data.every((n) =>
      ["unread", "read", "acknowledged"].includes(n.status),
    ),
  );
  // 11. Test filtering with actor_id to verify seller notification isolation
  const actorIdNotifications =
    await api.functional.ecommerceMall.seller.notifications.index(
      sellerConnection,
      {
        body: {
          actor_id: seller.id,
          actor_type: "seller",
        },
      },
    );
  typia.assert(actorIdNotifications);
  TestValidator.equals(
    "actor_id filter returns seller's notifications count",
    actorIdNotifications.data.length,
    allNotifications.data.length,
  );
  // 12. Test combined filters
  const combinedFilters =
    await api.functional.ecommerceMall.seller.notifications.index(
      sellerConnection,
      {
        body: {
          type: "seller_approval",
          read_status: "unread",
          sort: "created_at",
          order: "desc",
          per_page: 5,
        },
      },
    );
  typia.assert(combinedFilters);
  TestValidator.equals(
    "combined filters limit is 5",
    combinedFilters.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "combined filters returns reasonable page count",
    combinedFilters.pagination.pages > 0,
  );
}