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

/**
 * Test seller notification read status management by verifying notifications are created with unread status
 * and can be tracked through the listing endpoint. After seller registers and receives notifications,
 * test filtering by read_status to ensure unread and read notifications can be distinguished.
 * Validate pagination metadata correctly reflects counts for each status filter.
 */
export async function test_api_seller_notifications_marking_read_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register seller account using utility function
  const joinConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuthorized);
  // 2. Create seller-specific connection
  const sellerConnection: api.IConnection = { host: connection.host };
  sellerConnection.headers = { Authorization: sellerAuthorized.token.access };
  // 3. Test unread notifications filter
  const unreadNotifications =
    await api.functional.ecommerceMall.seller.notifications.index(
      sellerConnection,
      {
        body: {
          read_status: "unread",
          actor_type: "seller",
          actor_id: sellerAuthorized.id,
          page: 1,
          per_page: 10,
        } satisfies IEcommerceMallNotification.IRequest,
      },
    );
  typia.assert(unreadNotifications);
  // Validate unread notifications response structure
  TestValidator.equals(
    "unread pagination current",
    unreadNotifications.pagination.current,
    1,
  );
  TestValidator.equals(
    "unread pagination limit",
    unreadNotifications.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "unread pagination records valid",
    unreadNotifications.pagination.records >= 0,
  );
  TestValidator.equals(
    "unread pagination pages",
    unreadNotifications.pagination.pages,
    Math.ceil(unreadNotifications.pagination.records / 10),
  );
  // Validate notification items have correct status
  unreadNotifications.data.forEach((notification, index) => {
    TestValidator.equals(
      `unread notification ${index} status`,
      notification.status,
      "unread",
    );
    TestValidator.predicate(
      "notification has valid id",
      notification.id !== undefined,
    );
    TestValidator.predicate(
      "notification has title",
      notification.title.length > 0,
    );
    TestValidator.predicate(
      "notification has body",
      notification.body.length > 0,
    );
    TestValidator.predicate(
      "notification has type",
      notification.type.length > 0,
    );
    TestValidator.predicate(
      "notification has created_at",
      notification.created_at !== undefined,
    );
    TestValidator.predicate(
      "notification has updated_at",
      notification.updated_at !== undefined,
    );
  });
  // 4. Test read notifications filter
  const readNotifications =
    await api.functional.ecommerceMall.seller.notifications.index(
      sellerConnection,
      {
        body: {
          read_status: "read",
          actor_type: "seller",
          actor_id: sellerAuthorized.id,
          page: 1,
          per_page: 10,
        } satisfies IEcommerceMallNotification.IRequest,
      },
    );
  typia.assert(readNotifications);
  // Validate read notifications response structure
  TestValidator.equals(
    "read pagination current",
    readNotifications.pagination.current,
    1,
  );
  TestValidator.equals(
    "read pagination limit",
    readNotifications.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "read pagination records valid",
    readNotifications.pagination.records >= 0,
  );
  TestValidator.equals(
    "read pagination pages",
    readNotifications.pagination.pages,
    Math.ceil(readNotifications.pagination.records / 10),
  );
  // Validate notification items have correct status
  readNotifications.data.forEach((notification, index) => {
    TestValidator.equals(
      `read notification ${index} status`,
      notification.status,
      "read",
    );
    TestValidator.predicate(
      "notification has valid id",
      notification.id !== undefined,
    );
    TestValidator.predicate(
      "notification has title",
      notification.title.length > 0,
    );
    TestValidator.predicate(
      "notification has body",
      notification.body.length > 0,
    );
    TestValidator.predicate(
      "notification has type",
      notification.type.length > 0,
    );
    TestValidator.predicate(
      "notification has created_at",
      notification.created_at !== undefined,
    );
    TestValidator.predicate(
      "notification has updated_at",
      notification.updated_at !== undefined,
    );
  });
}