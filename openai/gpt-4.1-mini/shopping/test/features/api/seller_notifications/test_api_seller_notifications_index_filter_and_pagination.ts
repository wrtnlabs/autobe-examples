import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallUserNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallUserNotification";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallUserNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserNotification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_notifications_index_filter_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Test retrieval of seller notifications with filters and pagination.
  // 1. Seller join and authorized connection
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorizedSeller = await authorize_seller_join(connection, {
    body: {
      email: RandomGenerator.alphaNumeric(8) + "@test.com",
      password: "password123",
      shopName: RandomGenerator.name(1),
    },
  });
  sellerConnection.headers = {
    Authorization: authorizedSeller.token.access,
  };
  // 2. Create multiple notifications manually via direct SDK (no direct creation API given, so simulate creation via repeated calls to index endpoint filtering for no data - here we will just test the filtering responses with random search terms)
  //   Since creation is not available, we'll test filtering and pagination assuming data exists for this seller.
  // 3. Test fetch with no filters (should retrieve only seller's notifications, page 1, limit default)
  const baseResponse =
    await api.functional.shoppingMall.seller.notifications.index(
      sellerConnection,
      { body: {} },
    );
  typia.assert(baseResponse);
  // Assertions on response structure
  TestValidator.predicate(
    "pagination current page >= 1",
    baseResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit positive",
    baseResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    baseResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    baseResponse.pagination.pages >= 0,
  );
  // All data items must belong to seller's notifications and ownerType "seller"
  for (const notification of baseResponse.data) {
    TestValidator.equals(
      "ownerType is seller",
      notification.ownerType,
      "seller",
    );
    TestValidator.predicate(
      "notification is not deleted",
      notification.deletedAt === null,
    );
  }
  // 4. Test filter by isRead true
  const readResponse =
    await api.functional.shoppingMall.seller.notifications.index(
      sellerConnection,
      {
        body: { isRead: true },
      },
    );
  typia.assert(readResponse);
  readResponse.data.forEach((n) => {
    TestValidator.predicate("isRead true filter", n.isRead === true);
  });
  // 5. Test filter by isRead false
  const unreadResponse =
    await api.functional.shoppingMall.seller.notifications.index(
      sellerConnection,
      {
        body: { isRead: false },
      },
    );
  typia.assert(unreadResponse);
  unreadResponse.data.forEach((n) => {
    TestValidator.predicate("isRead false filter", n.isRead === false);
  });
  // 6. Test filter by deliveredFrom and deliveredTo (date range)
  const now = new Date();
  const pastDate = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 7); // 7 days ago
  const deliveredDateResponse =
    await api.functional.shoppingMall.seller.notifications.index(
      sellerConnection,
      {
        body: {
          deliveredFrom: pastDate.toISOString(),
          deliveredTo: now.toISOString(),
        },
      },
    );
  typia.assert(deliveredDateResponse);
  deliveredDateResponse.data.forEach((n) => {
    // deliveredAt either null or within range
    TestValidator.predicate(
      "deliveredAt null or in range",
      n.deliveredAt === null ||
        (n.deliveredAt >= pastDate.toISOString() &&
          n.deliveredAt <= now.toISOString()),
    );
  });
  // 7. Test search filter in title or body; use a random substring from existing notification if any
  const sampleNotification =
    baseResponse.data.length > 0
      ? RandomGenerator.pick(baseResponse.data)
      : null;
  if (sampleNotification) {
    const searchTerm =
      sampleNotification.title.length > 5
        ? sampleNotification.title.substring(0, 5)
        : sampleNotification.title;
    const searchResponse =
      await api.functional.shoppingMall.seller.notifications.index(
        sellerConnection,
        {
          body: { search: searchTerm },
        },
      );
    typia.assert(searchResponse);
    searchResponse.data.forEach((n) => {
      TestValidator.predicate(
        "search term in title or body",
        n.title.includes(searchTerm) || n.body.includes(searchTerm),
      );
    });
  }
  // 8. Test pagination: set limit 3, page 1; then page 2.
  const page1Resp =
    await api.functional.shoppingMall.seller.notifications.index(
      sellerConnection,
      {
        body: { limit: 3, page: 1 },
      },
    );
  typia.assert(page1Resp);
  TestValidator.equals("page 1 current", page1Resp.pagination.current, 1);
  TestValidator.predicate(
    "page 1 limit",
    page1Resp.pagination.limit === 3 ||
      page1Resp.pagination.limit === 0 ||
      page1Resp.pagination.limit === undefined,
  );
  const page2Resp =
    await api.functional.shoppingMall.seller.notifications.index(
      sellerConnection,
      {
        body: { limit: 3, page: 2 },
      },
    );
  typia.assert(page2Resp);
  TestValidator.equals("page 2 current", page2Resp.pagination.current, 2);
  // Ensure that page2 data differs or no data
  if (page2Resp.data.length && page1Resp.data.length) {
    const idsPage1 = page1Resp.data.map((d) => d.id).sort();
    const idsPage2 = page2Resp.data.map((d) => d.id).sort();
    TestValidator.notEquals(
      "page 1 and 2 data ids differ",
      JSON.stringify(idsPage1),
      JSON.stringify(idsPage2),
    );
  }
  // 9. Validate sorting by createdAt descending
  const sortedResp =
    await api.functional.shoppingMall.seller.notifications.index(
      sellerConnection,
      {
        body: { sortBy: "createdAt", sortOrder: "desc" },
      },
    );
  typia.assert(sortedResp);
  for (let i = 1; i < sortedResp.data.length; i++) {
    TestValidator.predicate(
      "sorted by createdAt desc",
      sortedResp.data[i - 1].createdAt >= sortedResp.data[i].createdAt,
    );
  }
  // 10. Test unauthorized access: use empty connection
  const noAuthConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized access denied",
    401,
    async () =>
      await api.functional.shoppingMall.seller.notifications.index(
        noAuthConnection,
        {
          body: {},
        },
      ),
  );
}
