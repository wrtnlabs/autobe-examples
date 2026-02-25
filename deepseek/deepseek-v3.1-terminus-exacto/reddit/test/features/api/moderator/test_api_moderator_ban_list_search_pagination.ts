import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityBan";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

/**
 * Test moderator ban list search and pagination functionality.
 *
 * Tests a moderator's ability to retrieve paginated ban records with various filtering
 * options. Since we cannot create communities or bans through available APIs,
 * this test focuses on validating the API contract and response structure.
 */
export async function test_api_moderator_ban_list_search_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate as a moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  typia.assert(moderator);
  // Since we cannot create communities or bans through available APIs,
  // we'll test the API contract with a random community ID
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // 2. Test basic pagination with default parameters
  const defaultPage =
    await api.functional.communityPlatform.moderator.communities.bans.index(
      moderatorConnection,
      {
        communityId,
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformCommunityBan.IRequest,
      },
    );
  typia.assert(defaultPage);
  // Validate pagination metadata structure
  TestValidator.predicate(
    "pagination metadata exists",
    defaultPage.pagination !== undefined,
  );
  TestValidator.equals("current page", defaultPage.pagination.current, 1);
  TestValidator.equals("limit", defaultPage.pagination.limit, 10);
  TestValidator.predicate(
    "records is non-negative",
    defaultPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    defaultPage.pagination.pages >= 0,
  );
  // 3. Test different page and limit combinations
  const pageLimitTests = [
    { page: 2, limit: 5 },
    { page: 1, limit: 20 },
    { page: 3, limit: 15 },
  ];
  for (const testCase of pageLimitTests) {
    const paginatedResult =
      await api.functional.communityPlatform.moderator.communities.bans.index(
        moderatorConnection,
        {
          communityId,
          body: {
            page: testCase.page,
            limit: testCase.limit,
          } satisfies ICommunityPlatformCommunityBan.IRequest,
        },
      );
    typia.assert(paginatedResult);
    TestValidator.equals(
      `page ${testCase.page} current page`,
      paginatedResult.pagination.current,
      testCase.page,
    );
    TestValidator.equals(
      `page ${testCase.page} limit`,
      paginatedResult.pagination.limit,
      testCase.limit,
    );
  }
  // 4. Test status filtering (even if no bans exist, should return valid structure)
  const statuses = ["active", "expired", "revoked"] as const;
  for (const status of statuses) {
    const statusResult =
      await api.functional.communityPlatform.moderator.communities.bans.index(
        moderatorConnection,
        {
          communityId,
          body: {
            status,
            page: 1,
            limit: 10,
          } satisfies ICommunityPlatformCommunityBan.IRequest,
        },
      );
    typia.assert(statusResult);
    // Validate response structure regardless of data presence
    TestValidator.predicate(
      "status result has pagination",
      statusResult.pagination !== undefined,
    );
    TestValidator.predicate(
      "status result has data array",
      Array.isArray(statusResult.data),
    );
  }
  // 5. Test search functionality
  const searchResult =
    await api.functional.communityPlatform.moderator.communities.bans.index(
      moderatorConnection,
      {
        communityId,
        body: {
          search: "test",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformCommunityBan.IRequest,
      },
    );
  typia.assert(searchResult);
  // 6. Test date range filtering
  const dateRangeResult =
    await api.functional.communityPlatform.moderator.communities.bans.index(
      moderatorConnection,
      {
        communityId,
        body: {
          banned_at_start: new Date(
            Date.now() - 7 * 24 * 60 * 60 * 1000,
          ).toISOString(), // 7 days ago
          banned_at_end: new Date().toISOString(),
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformCommunityBan.IRequest,
      },
    );
  typia.assert(dateRangeResult);
  // 7. Test combined filtering
  const combinedResult =
    await api.functional.communityPlatform.moderator.communities.bans.index(
      moderatorConnection,
      {
        communityId,
        body: {
          status: "active",
          search: "violation",
          banned_at_start: new Date(
            Date.now() - 30 * 24 * 60 * 60 * 1000,
          ).toISOString(), // 30 days ago
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformCommunityBan.IRequest,
      },
    );
  typia.assert(combinedResult);
  // Validate the API response structure conforms to the expected schema
  // Even if no data is returned, the structure should be valid
  TestValidator.predicate(
    "combined result has valid structure",
    combinedResult.pagination !== undefined &&
      Array.isArray(combinedResult.data),
  );
}
