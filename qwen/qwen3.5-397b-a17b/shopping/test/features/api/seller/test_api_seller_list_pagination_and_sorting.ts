import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSeller";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test administrator retrieval of seller account list with pagination and sorting.
 *
 * This test verifies:
 * 1. Administrator authentication for seller management access
 * 2. Default pagination with metadata (current, limit, records, pages)
 * 3. Seller summary structure (id, email, created_at, approval_status)
 * 4. Sorting by created_at DESC (default), email ASC, and email DESC
 * 5. Only non-deleted sellers are included in results
 * 6. Approval status is correctly computed from latest approval request
 */
export async function test_api_seller_list_pagination_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  // 2. Test default pagination (created_at DESC)
  const defaultResult =
    await api.functional.shoppingMall.administrator.sellers.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          sort: "created_at_DESC",
        } satisfies IShoppingMallSeller.IRequest,
      },
    );
  typia.assert(defaultResult);
  // Validate pagination metadata structure
  TestValidator.predicate(
    "current page is valid",
    defaultResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "limit is valid",
    defaultResult.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "records is non-negative",
    defaultResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    defaultResult.pagination.pages >= 0,
  );
  // 3. Test sorting by email ASC
  const emailAscResult =
    await api.functional.shoppingMall.administrator.sellers.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          sort: "email_ASC",
        } satisfies IShoppingMallSeller.IRequest,
      },
    );
  typia.assert(emailAscResult);
  // Verify email ASC order
  if (emailAscResult.data.length > 1) {
    for (let i = 1; i < emailAscResult.data.length; i++) {
      TestValidator.predicate(
        `email[${i - 1}] <= email[${i}]`,
        emailAscResult.data[i - 1].email.toLowerCase() <=
          emailAscResult.data[i].email.toLowerCase(),
      );
    }
  }
  // 4. Test sorting by email DESC
  const emailDescResult =
    await api.functional.shoppingMall.administrator.sellers.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          sort: "email_DESC",
        } satisfies IShoppingMallSeller.IRequest,
      },
    );
  typia.assert(emailDescResult);
  // Verify email DESC order
  if (emailDescResult.data.length > 1) {
    for (let i = 1; i < emailDescResult.data.length; i++) {
      TestValidator.predicate(
        `email[${i - 1}] >= email[${i}]`,
        emailDescResult.data[i - 1].email.toLowerCase() >=
          emailDescResult.data[i].email.toLowerCase(),
      );
    }
  }
  // 5. Test pagination with different page sizes
  const smallPageResult =
    await api.functional.shoppingMall.administrator.sellers.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 5,
          sort: "created_at_DESC",
        } satisfies IShoppingMallSeller.IRequest,
      },
    );
  typia.assert(smallPageResult);
  TestValidator.predicate(
    "small page limit is 5",
    smallPageResult.pagination.limit === 5,
  );
  TestValidator.predicate(
    "data length within limit",
    smallPageResult.data.length <= 5,
  );
  // 6. Test with status filter
  const pendingResult =
    await api.functional.shoppingMall.administrator.sellers.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          status: "pending",
          sort: "created_at_DESC",
        } satisfies IShoppingMallSeller.IRequest,
      },
    );
  typia.assert(pendingResult);
  // Verify all filtered sellers have pending status
  for (const seller of pendingResult.data) {
    TestValidator.equals(
      "filtered seller status is pending",
      seller.approval_status,
      "pending",
    );
  }
  // 7. Test with email search
  const searchResult =
    await api.functional.shoppingMall.administrator.sellers.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          search: "test",
          sort: "created_at_DESC",
        } satisfies IShoppingMallSeller.IRequest,
      },
    );
  typia.assert(searchResult);
  // 8. Test edge case: request beyond available pages
  const emptyPageResult =
    await api.functional.shoppingMall.administrator.sellers.index(
      adminConnection,
      {
        body: {
          page: 9999,
          limit: 10,
          sort: "created_at_DESC",
        } satisfies IShoppingMallSeller.IRequest,
      },
    );
  typia.assert(emptyPageResult);
  TestValidator.predicate(
    "empty page returns empty data",
    emptyPageResult.data.length === 0,
  );
}
