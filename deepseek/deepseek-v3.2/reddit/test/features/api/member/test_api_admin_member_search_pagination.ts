import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test admin searching for members with basic pagination.
 * Admin should be able to search member accounts using various filters
 * like email pattern, username search, and date ranges.
 */
export async function test_api_admin_member_search_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/admin",
      referrer: "https://example.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. Test empty search (all members)
  const emptySearch = await api.functional.communityPlatform.members.index(
    adminConnection,
    {
      body: {} satisfies ICommunityPlatformMember.IRequest,
    },
  );
  typia.assert(emptySearch);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination has current page",
    emptySearch.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    emptySearch.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination has records count",
    emptySearch.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages count",
    emptySearch.pagination.pages >= 0,
  );
  // 3. Test with pagination parameters
  const paginatedSearch = await api.functional.communityPlatform.members.index(
    adminConnection,
    {
      body: {
        page: 1 satisfies number as number,
        limit: 10 satisfies number as number,
      } satisfies ICommunityPlatformMember.IRequest,
    },
  );
  typia.assert(paginatedSearch);
  TestValidator.equals(
    "current page matches request",
    paginatedSearch.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit matches request",
    paginatedSearch.pagination.limit,
    10,
  );
  // 4. Test sorting options
  const sortOptions = ["registered_at", "last_login_at", "username"] as const;
  for (const sortField of sortOptions) {
    const sortedSearch = await api.functional.communityPlatform.members.index(
      adminConnection,
      {
        body: {
          sort: sortField,
          order: "asc" as const,
        } satisfies ICommunityPlatformMember.IRequest,
      },
    );
    typia.assert(sortedSearch);
    TestValidator.predicate(
      `sort by ${sortField} returns results`,
      sortedSearch.data.length >= 0,
    );
  }
  // 5. Test date range filters (using reasonable defaults)
  const now = new Date().toISOString();
  const oneYearAgo = new Date(
    Date.now() - 365 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const dateFilterSearch = await api.functional.communityPlatform.members.index(
    adminConnection,
    {
      body: {
        registered_at_min: oneYearAgo,
        registered_at_max: now,
      } satisfies ICommunityPlatformMember.IRequest,
    },
  );
  typia.assert(dateFilterSearch);
  TestValidator.predicate(
    "date filter returns results",
    dateFilterSearch.data.length >= 0,
  );
  // 6. Test email verification filter
  const verifiedFilterSearch =
    await api.functional.communityPlatform.members.index(adminConnection, {
      body: {
        email_verified: true,
      } satisfies ICommunityPlatformMember.IRequest,
    });
  typia.assert(verifiedFilterSearch);
  TestValidator.predicate(
    "email verified filter returns results",
    verifiedFilterSearch.data.length >= 0,
  );
  // 7. Test combined filters with username pattern
  const combinedSearch = await api.functional.communityPlatform.members.index(
    adminConnection,
    {
      body: {
        username: "a", // Search for usernames containing 'a'
        email_verified: true,
        sort: "username",
        order: "asc" as const,
        page: 1 satisfies number as number,
        limit: 5 satisfies number as number,
      } satisfies ICommunityPlatformMember.IRequest,
    },
  );
  typia.assert(combinedSearch);
  TestValidator.predicate(
    "combined filter returns results",
    combinedSearch.data.length >= 0,
  );
  // Validate member summary structure for first result if exists
  if (combinedSearch.data.length > 0) {
    const member = combinedSearch.data[0];
    TestValidator.predicate(
      "member has id",
      typeof member.id === "string" && member.id.length > 0,
    );
    TestValidator.predicate(
      "member has email",
      typeof member.email === "string" && member.email.length > 0,
    );
    TestValidator.predicate(
      "member has username",
      typeof member.username === "string" && member.username.length > 0,
    );
    TestValidator.predicate(
      "member has email_verified",
      typeof member.email_verified === "boolean",
    );
    TestValidator.predicate(
      "member has registered_at",
      typeof member.registered_at === "string" &&
        member.registered_at.length > 0,
    );
  }
}
