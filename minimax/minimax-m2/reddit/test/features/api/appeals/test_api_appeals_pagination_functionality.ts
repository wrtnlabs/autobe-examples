import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformModerationAppeal";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModeratorSession";
import type { IRedditPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModerationAction";
import type { IRedditPlatformModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModerationAppeal";
import type { IRedditPlatformPlatformAdministratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPlatformAdministratorSession";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";
import type { IRedditPlatformRegisteredUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUserSession";

export async function test_api_appeals_pagination_functionality(
  connection: api.IConnection,
) {
  // Create registered user for authentication
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(8),
        email: userEmail,
        password: "SecurePass123!",
        display_name: "Test User",
        bio: "Testing pagination functionality",
        location: "Test Location",
        website_url: typia.random<string & tags.Format<"uri">>(),
        avatar_url: typia.random<string & tags.Format<"uri">>(),
        href: "https://test.example.com/app",
        referrer: "https://test.example.com/referrer",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(user);

  // Test 1: Default pagination (page 1, default limit)
  const defaultResponse: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.registeredUser.appeals.index(
      connection,
      {
        body: {} satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(defaultResponse);

  // Validate default pagination metadata
  TestValidator.equals(
    "default page should be 1",
    defaultResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "default limit should be 20",
    defaultResponse.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination metadata should be consistent",
    defaultResponse.pagination.records >= 0 &&
      defaultResponse.pagination.pages >= 0 &&
      defaultResponse.pagination.current >= 0 &&
      defaultResponse.pagination.limit >= 0,
  );

  // Test 2: Custom page number (page 2)
  const page2Response: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.registeredUser.appeals.index(
      connection,
      {
        body: {
          page: 2,
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(page2Response);

  TestValidator.equals(
    "page 2 should have current = 2",
    page2Response.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 2 should maintain default limit",
    page2Response.pagination.limit,
    20,
  );

  // Test 3: Custom limit (limit 5)
  const limitedResponse: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.registeredUser.appeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(limitedResponse);

  TestValidator.equals(
    "limited response should have current = 1",
    limitedResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "limited response should have limit = 5",
    limitedResponse.pagination.limit,
    5,
  );

  // Test 4: Custom page and limit combination
  const customResponse: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.registeredUser.appeals.index(
      connection,
      {
        body: {
          page: 3,
          limit: 10,
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(customResponse);

  TestValidator.equals(
    "custom response should have current = 3",
    customResponse.pagination.current,
    3,
  );
  TestValidator.equals(
    "custom response should have limit = 10",
    customResponse.pagination.limit,
    10,
  );

  // Test 5: High page number (beyond available data)
  const highPageResponse: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.registeredUser.appeals.index(
      connection,
      {
        body: {
          page: 9999,
          limit: 10,
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(highPageResponse);

  TestValidator.equals(
    "high page response should have current = 9999",
    highPageResponse.pagination.current,
    9999,
  );
  TestValidator.equals(
    "high page response should have limit = 10",
    highPageResponse.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "high page should return empty data array",
    Array.isArray(highPageResponse.data) && highPageResponse.data.length === 0,
  );

  // Test 6: Maximum limit (100)
  const maxLimitResponse: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.registeredUser.appeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(maxLimitResponse);

  TestValidator.equals(
    "max limit response should have current = 1",
    maxLimitResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "max limit response should have limit = 100",
    maxLimitResponse.pagination.limit,
    100,
  );

  // Test 7: Minimum page number (1)
  const minPageResponse: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.registeredUser.appeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(minPageResponse);

  TestValidator.equals(
    "min page response should have current = 1",
    minPageResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "min page response should have limit = 10",
    minPageResponse.pagination.limit,
    10,
  );

  // Test 8: Pagination consistency across different requests
  const consistencyCheck: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.registeredUser.appeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(consistencyCheck);

  TestValidator.equals(
    "consistency check should match default pagination",
    consistencyCheck.pagination.current,
    defaultResponse.pagination.current,
  );
  TestValidator.equals(
    "consistency check should match default limit",
    consistencyCheck.pagination.limit,
    defaultResponse.pagination.limit,
  );

  // Test 9: Validate data structure consistency
  TestValidator.predicate(
    "all responses should have valid data arrays",
    Array.isArray(defaultResponse.data) &&
      Array.isArray(page2Response.data) &&
      Array.isArray(limitedResponse.data) &&
      Array.isArray(customResponse.data) &&
      Array.isArray(highPageResponse.data) &&
      Array.isArray(maxLimitResponse.data) &&
      Array.isArray(minPageResponse.data) &&
      Array.isArray(consistencyCheck.data),
  );

  // Test 10: Validate pagination metadata structure
  const allResponses = [
    defaultResponse,
    page2Response,
    limitedResponse,
    customResponse,
    highPageResponse,
    maxLimitResponse,
    minPageResponse,
    consistencyCheck,
  ];

  for (const response of allResponses) {
    TestValidator.predicate(
      "pagination should have all required fields",
      typeof response.pagination.current === "number" &&
        typeof response.pagination.limit === "number" &&
        typeof response.pagination.records === "number" &&
        typeof response.pagination.pages === "number",
    );
  }
}
