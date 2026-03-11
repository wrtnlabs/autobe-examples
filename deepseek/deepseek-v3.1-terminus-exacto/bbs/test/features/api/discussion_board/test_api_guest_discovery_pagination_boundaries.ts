import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_discovery_pagination_boundaries(
  connection: api.IConnection,
): Promise<void> {
  // Create guest connection
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardGuest.IJoin,
  });
  // Test 1: Default pagination (page 1, default limit)
  const defaultPage =
    await api.functional.discussionBoard.guest.discovery.index(
      guestConnection,
      {
        body: {} satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(defaultPage);
  TestValidator.equals(
    "default page should be 1",
    defaultPage.pagination.current,
    1,
  );
  TestValidator.predicate(
    "default limit should be positive",
    defaultPage.pagination.limit > 0,
  );
  TestValidator.predicate(
    "total records should be non-negative",
    defaultPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages should be non-negative",
    defaultPage.pagination.pages >= 0,
  );
  // Test 2: Page 1 with minimum limit
  const page1MinLimit =
    await api.functional.discussionBoard.guest.discovery.index(
      guestConnection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(page1MinLimit);
  TestValidator.equals("page should be 1", page1MinLimit.pagination.current, 1);
  TestValidator.equals("limit should be 1", page1MinLimit.pagination.limit, 1);
  TestValidator.predicate(
    "data length should not exceed limit",
    page1MinLimit.data.length <= page1MinLimit.pagination.limit,
  );
  // Test 3: Page 1 with maximum limit
  const page1MaxLimit =
    await api.functional.discussionBoard.guest.discovery.index(
      guestConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(page1MaxLimit);
  TestValidator.equals("page should be 1", page1MaxLimit.pagination.current, 1);
  TestValidator.equals(
    "limit should be 100",
    page1MaxLimit.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "data length should not exceed limit",
    page1MaxLimit.data.length <= page1MaxLimit.pagination.limit,
  );
  // Test 4: High page number (beyond likely content)
  const highPage = await api.functional.discussionBoard.guest.discovery.index(
    guestConnection,
    {
      body: {
        page: 1000,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(highPage);
  TestValidator.equals(
    "page should match request",
    highPage.pagination.current,
    1000,
  );
  TestValidator.equals(
    "high page should return empty data",
    highPage.data.length,
    0,
  );
  // Test 5: Middle page if multiple pages exist
  if (defaultPage.pagination.pages > 1) {
    const middlePage =
      await api.functional.discussionBoard.guest.discovery.index(
        guestConnection,
        {
          body: {
            page: Math.floor(defaultPage.pagination.pages / 2),
            limit: defaultPage.pagination.limit,
          } satisfies IDiscussionBoardArticle.IRequest,
        },
      );
    typia.assert(middlePage);
    TestValidator.equals(
      "middle page should match request",
      middlePage.pagination.current,
      Math.floor(defaultPage.pagination.pages / 2),
    );
    TestValidator.predicate(
      "middle page should have data",
      middlePage.data.length > 0,
    );
  }
  // Test 6: Last page
  if (defaultPage.pagination.pages > 0) {
    const lastPage = await api.functional.discussionBoard.guest.discovery.index(
      guestConnection,
      {
        body: {
          page: defaultPage.pagination.pages,
          limit: defaultPage.pagination.limit,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
    typia.assert(lastPage);
    TestValidator.equals(
      "last page should match total pages",
      lastPage.pagination.current,
      defaultPage.pagination.pages,
    );
    TestValidator.predicate(
      "last page data should not exceed limit",
      lastPage.data.length <= lastPage.pagination.limit,
    );
  }
  // Test 7: Verify pagination calculations consistency
  TestValidator.equals(
    "total pages calculation should be consistent",
    defaultPage.pagination.pages,
    Math.ceil(defaultPage.pagination.records / defaultPage.pagination.limit),
  );
  // Test 8: Different limit values
  const limit20 = await api.functional.discussionBoard.guest.discovery.index(
    guestConnection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(limit20);
  TestValidator.equals("limit should be 20", limit20.pagination.limit, 20);
  TestValidator.predicate(
    "data length should respect limit",
    limit20.data.length <= 20,
  );
}
