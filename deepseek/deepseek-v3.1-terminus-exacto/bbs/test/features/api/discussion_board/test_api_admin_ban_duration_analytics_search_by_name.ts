import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBanDuration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanDuration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardBanDuration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardBanDuration";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_ban_duration_analytics_search_by_name(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection using available utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: "admin-search-test@example.com",
      password: "testpassword123",
      display_name: "Search Test Admin",
      href: "https://example.com",
      referrer: "https://example.com",
      ip: "192.168.1.1",
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Test search functionality with various scenarios
  const searchTests = [
    { search: "", expected: "should return all ban durations" },
    {
      search: "1 Day",
      expected: "should return ban durations containing '1 Day'",
    },
    { search: "Permanent", expected: "should return permanent ban durations" },
    { search: "Temporary", expected: "should return temporary ban durations" },
    {
      search: "Week",
      expected: "should return ban durations containing 'Week'",
    },
    {
      search: "nonexistent-term-xyz",
      expected: "should return empty results for non-matching term",
    },
  ];
  for (const test of searchTests) {
    const response =
      await api.functional.discussionBoard.admin.analytics.ban_durations.index(
        adminConnection,
        {
          body: {
            search: test.search,
            page: 1,
            limit: 10,
          } satisfies IDiscussionBoardBanDuration.IRequest,
        },
      );
    typia.assert(response);
    // Validate pagination structure
    TestValidator.predicate(
      "pagination should have current page",
      response.pagination.current >= 0,
    );
    TestValidator.predicate(
      "pagination should have limit",
      response.pagination.limit > 0,
    );
    TestValidator.predicate(
      "pagination should have records count",
      response.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pagination should have pages count",
      response.pagination.pages >= 0,
    );
    // Validate data array
    TestValidator.equals(
      "data should be an array",
      Array.isArray(response.data),
      true,
    );
    // Validate each ban duration item
    for (const item of response.data) {
      typia.assert(item);
      TestValidator.predicate(
        "item should have UUID id",
        /^[0-9a-f-]{36}$/i.test(item.id),
      );
      TestValidator.predicate(
        "item should have non-empty name",
        item.name.length > 0,
      );
      TestValidator.predicate(
        "item should have non-empty description",
        item.description.length > 0,
      );
      TestValidator.predicate(
        "item should have valid duration hours",
        item.duration_hours >= 0,
      );
      TestValidator.equals(
        "item should have boolean is_permanent",
        typeof item.is_permanent,
        "boolean",
      );
    }
    // For non-empty search, validate that results contain the search term
    if (
      test.search &&
      test.search !== "" &&
      test.search !== "nonexistent-term-xyz"
    ) {
      TestValidator.predicate(
        `search '${test.search}' should return some results`,
        response.data.length > 0,
      );
    }
    // For non-matching search, validate empty results
    if (test.search === "nonexistent-term-xyz") {
      TestValidator.equals(
        "non-matching search should return empty",
        response.data.length,
        0,
      );
    }
  }
}
