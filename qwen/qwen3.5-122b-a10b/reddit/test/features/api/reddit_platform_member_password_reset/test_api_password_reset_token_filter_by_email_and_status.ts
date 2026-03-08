import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformMemberPasswordReset";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_password_reset_token_filter_by_email_and_status(
  connection: api.IConnection,
): Promise<void> {
  // Create member accounts for testing
  const member1Email = `test1_${typia.random<string & tags.Format<"email">>()}`;
  const member2Email = `test2_${typia.random<string & tags.Format<"email">>()}`;
  const member3Email = `admin_${typia.random<string & tags.Format<"email">>()}`;
  // Create member 1
  const member1Connection: api.IConnection = { host: connection.host };
  const member1Auth = await authorize_member_join(member1Connection, {
    body: {
      email: member1Email,
      password: "Password123!",
      username: `user_${RandomGenerator.alphabets(5)}`,
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member1Auth);
  // Create member 2
  const member2Connection: api.IConnection = { host: connection.host };
  const member2Auth = await authorize_member_join(member2Connection, {
    body: {
      email: member2Email,
      password: "Password123!",
      username: `user_${RandomGenerator.alphabets(5)}`,
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member2Auth);
  // Create member 3 (admin-like email)
  const member3Connection: api.IConnection = { host: connection.host };
  const member3Auth = await authorize_member_join(member3Connection, {
    body: {
      email: member3Email,
      password: "Password123!",
      username: `admin_${RandomGenerator.alphabets(5)}`,
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member3Auth);
  // Test 1: Query with partial email match (search for "test")
  const searchTestConnection: api.IConnection = { host: connection.host };
  const searchTestResult =
    await api.functional.redditPlatform.member.password_resets.index(
      searchTestConnection,
      {
        body: {
          search: "test",
          status: "active",
          page: 1,
          limit: 20,
        } satisfies IRedditPlatformMemberPasswordReset.IRequest,
      },
    );
  typia.assert(searchTestResult);
  // Validate pagination metadata exists
  TestValidator.equals(
    "pagination current page",
    searchTestResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    searchTestResult.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    searchTestResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    searchTestResult.pagination.pages >= 0,
  );
  // Test 2: Query with partial email match for "admin"
  const adminSearchConnection: api.IConnection = { host: connection.host };
  const adminSearchResult =
    await api.functional.redditPlatform.member.password_resets.index(
      adminSearchConnection,
      {
        body: {
          search: "admin",
          status: "active",
          page: 1,
          limit: 20,
        } satisfies IRedditPlatformMemberPasswordReset.IRequest,
      },
    );
  typia.assert(adminSearchResult);
  // Test 3: Query with no search filter (all active tokens)
  const allActiveConnection: api.IConnection = { host: connection.host };
  const allActiveResult =
    await api.functional.redditPlatform.member.password_resets.index(
      allActiveConnection,
      {
        body: {
          status: "active",
          page: 1,
          limit: 50,
        } satisfies IRedditPlatformMemberPasswordReset.IRequest,
      },
    );
  typia.assert(allActiveResult);
  // Test 4: Query with expired status
  const expiredConnection: api.IConnection = { host: connection.host };
  const expiredResult =
    await api.functional.redditPlatform.member.password_resets.index(
      expiredConnection,
      {
        body: {
          status: "expired",
          page: 1,
          limit: 20,
        } satisfies IRedditPlatformMemberPasswordReset.IRequest,
      },
    );
  typia.assert(expiredResult);
  // Test 5: Query with consumed status
  const consumedConnection: api.IConnection = { host: connection.host };
  const consumedResult =
    await api.functional.redditPlatform.member.password_resets.index(
      consumedConnection,
      {
        body: {
          status: "consumed",
          page: 1,
          limit: 20,
        } satisfies IRedditPlatformMemberPasswordReset.IRequest,
      },
    );
  typia.assert(consumedResult);
  // Test 6: Query with date range filters
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const dateRangeConnection: api.IConnection = { host: connection.host };
  const dateRangeResult =
    await api.functional.redditPlatform.member.password_resets.index(
      dateRangeConnection,
      {
        body: {
          created_at_from: thirtyDaysAgo.toISOString(),
          created_at_to: thirtyDaysFromNow.toISOString(),
          page: 1,
          limit: 20,
        } satisfies IRedditPlatformMemberPasswordReset.IRequest,
      },
    );
  typia.assert(dateRangeResult);
  // Test 7: Verify pagination works correctly
  const paginationTestConnection: api.IConnection = { host: connection.host };
  const firstPage =
    await api.functional.redditPlatform.member.password_resets.index(
      paginationTestConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IRedditPlatformMemberPasswordReset.IRequest,
      },
    );
  typia.assert(firstPage);
  const secondPage =
    await api.functional.redditPlatform.member.password_resets.index(
      paginationTestConnection,
      {
        body: {
          page: 2,
          limit: 10,
        } satisfies IRedditPlatformMemberPasswordReset.IRequest,
      },
    );
  typia.assert(secondPage);
  // Validate pagination structure
  TestValidator.equals("first page number", firstPage.pagination.current, 1);
  TestValidator.equals("second page number", secondPage.pagination.current, 2);
  TestValidator.equals(
    "both pages have same limit",
    firstPage.pagination.limit,
    secondPage.pagination.limit,
  );
}
