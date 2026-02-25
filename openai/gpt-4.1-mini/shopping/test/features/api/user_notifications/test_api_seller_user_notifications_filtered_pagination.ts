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

export async function test_api_seller_user_notifications_filtered_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Test retrieval of user notifications for authenticated seller with various filters and pagination.
  // 1. Seller joins and gets authorized connection
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: `test_${RandomGenerator.alphaNumeric(10)}@example.com`,
      password: "TestPassword123!",
      shopName: "Test Shop",
      shopDescription: "Test Description",
      logoUri: null,
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);
  // Create a new seller connection with auth token automatically via utility returned token
  const sellerConnection: api.IConnection = { host: connection.host };
  sellerConnection.headers = { Authorization: `Bearer ${seller.token.access}` };
  // Prepare filter values
  const ownerType = "seller";
  const now = new Date();
  // We assume that the test environment has multiple notifications for this seller.
  // Define various filter cases to test
  const filterCases: IShoppingMallUserNotification.IRequest[] = [
    { ownerType },
    { ownerType, isRead: true },
    { ownerType, isRead: false },
    {
      ownerType,
      deliveredFrom: new Date(
        now.getTime() - 1000 * 60 * 60 * 24 * 30,
      ).toISOString(),
    }, // delivered last 30 days
    { ownerType, deliveredTo: now.toISOString() },
    {
      ownerType,
      readFrom: new Date(
        now.getTime() - 1000 * 60 * 60 * 24 * 10,
      ).toISOString(),
    }, // read last 10 days
    { ownerType, readTo: now.toISOString() },
    { ownerType, search: "test" },
    { ownerType, limit: 5, page: 1, sortBy: "deliveredAt", sortOrder: "desc" },
    { ownerType, limit: 5, page: 2, sortBy: "deliveredAt", sortOrder: "desc" },
  ];
  // Iterate over filterCases and test
  for (const [i, filter] of filterCases.entries()) {
    const output =
      await api.functional.shoppingMall.seller.userNotifications.index(
        sellerConnection,
        { body: filter },
      );
    typia.assert(output);
    // Validate pagination fields
    TestValidator.predicate(
      `case ${i} pagination current page valid`,
      output.pagination.current >= 1,
    );
    TestValidator.predicate(
      `case ${i} pagination limit valid`,
      output.pagination.limit >= 0,
    );
    TestValidator.predicate(
      `case ${i} pagination records valid`,
      output.pagination.records >= 0,
    );
    TestValidator.predicate(
      `case ${i} pagination pages valid`,
      output.pagination.pages >= 0,
    );
    // Validate all data entries
    for (const notif of output.data) {
      typia.assert(notif);
      // Confirm ownerType matches
      TestValidator.equals(
        `case ${i} ownerType matches`,
        notif.ownerType,
        ownerType,
      );
      // Check required fields presence
      TestValidator.predicate(
        `case ${i} idpresent`,
        typeof notif.id === "string" && notif.id.length > 0,
      );
      TestValidator.predicate(
        `case ${i} titlepresent`,
        typeof notif.title === "string" && notif.title.length > 0,
      );
      TestValidator.predicate(
        `case ${i} bodypresent`,
        typeof notif.body === "string" && notif.body.length > 0,
      );
      // Validate isRead boolean
      TestValidator.predicate(
        `case ${i} isRead type`,
        typeof notif.isRead === "boolean",
      );
      // Validate timestamps if not null
      if (notif.deliveredAt !== null) {
        new Date(notif.deliveredAt); // should not throw
      }
      if (notif.readAt !== null) {
        new Date(notif.readAt); // should not throw
      }
      // Validate url and imageUrl can be null or string
      if (notif.url !== null) {
        TestValidator.predicate(
          `case ${i} url string type`,
          typeof notif.url === "string",
        );
      }
      if (notif.imageUrl !== null) {
        TestValidator.predicate(
          `case ${i} imageUrl string type`,
          typeof notif.imageUrl === "string",
        );
      }
    }
    // Pagination behavior check
    if (filter.limit !== undefined && filter.page !== undefined) {
      TestValidator.equals(
        `case ${i} pagination current match`,
        output.pagination.current,
        filter.page,
      );
      TestValidator.equals(
        `case ${i} pagination limit match`,
        output.pagination.limit,
        filter.limit,
      );
      // If there are multiple pages, we expect different data sets
      if (output.pagination.pages > 1 && filter.page === 2) {
        const firstPage =
          await api.functional.shoppingMall.seller.userNotifications.index(
            sellerConnection,
            {
              body: { ...filter, page: 1 },
            },
          );
        typia.assert(firstPage);
        TestValidator.notEquals(
          `case ${i} page data differs`,
          firstPage.data[0]?.id,
          output.data[0]?.id,
        );
      }
    }
    // Sorting verification
    if (filter.sortBy) {
      const sorted = [...output.data];
      sorted.sort((a, b) => {
        const field = filter.sortBy!;
        let result = 0;
        // Sort comparing generic fields
        const valA = (a as any)[field];
        const valB = (b as any)[field];
        if (valA === null && valB === null) result = 0;
        else if (valA === null) result = -1;
        else if (valB === null) result = 1;
        else if (valA < valB) result = -1;
        else if (valA > valB) result = 1;
        result = filter.sortOrder === "desc" ? -result : result;
        return result;
      });
      for (let idx = 0; idx < output.data.length; ++idx) {
        TestValidator.equals(
          `case ${i} sortOrder index ${idx}`,
          output.data[idx].id,
          sorted[idx].id,
        );
      }
    }
  }
  // Authorization enforcement check
  // Generic connection without auth headers should fail
  await TestValidator.error("unauthorized access without token", async () => {
    await api.functional.shoppingMall.seller.userNotifications.index(
      { host: connection.host },
      { body: { ownerType: "seller" } },
    );
  });
}
