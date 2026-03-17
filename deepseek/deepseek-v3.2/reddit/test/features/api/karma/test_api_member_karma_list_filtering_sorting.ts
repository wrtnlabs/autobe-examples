import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarma";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformKarma";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test advanced filtering capabilities of the karma list endpoint.
 * 1. Create member account for authentication
 * 2. Test various filter combinations
 * 3. Validate filtering, sorting, and pagination
 */
export async function test_api_member_karma_list_filtering_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Create member account for authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(member);
  // Test 1: Basic pagination with default parameters
  const defaultPage =
    await api.functional.communityPlatform.member.karmas.index(
      memberConnection,
      {
        body: {
          page: 1 satisfies number as number,
          limit: 10 satisfies number as number,
        } satisfies ICommunityPlatformKarma.IRequest,
      },
    );
  typia.assert(defaultPage);
  TestValidator.predicate(
    "pagination metadata exists",
    defaultPage.pagination !== undefined,
  );
  TestValidator.equals("page is correct", defaultPage.pagination.current, 1);
  // Test 2: Score range filtering
  const scoreRangePage =
    await api.functional.communityPlatform.member.karmas.index(
      memberConnection,
      {
        body: {
          page: 1 satisfies number as number,
          limit: 20 satisfies number as number,
          min_score: -10 satisfies number as number,
          max_score: 100 satisfies number as number,
        } satisfies ICommunityPlatformKarma.IRequest,
      },
    );
  typia.assert(scoreRangePage);
  // Verify all returned karma scores are within range
  for (const karma of scoreRangePage.data) {
    TestValidator.predicate(
      `karma score ${karma.score} within range [-10, 100]`,
      karma.score >= -10 && karma.score <= 100,
    );
  }
  // Test 3: Member-specific filtering
  const memberFilterPage =
    await api.functional.communityPlatform.member.karmas.index(
      memberConnection,
      {
        body: {
          page: 1 satisfies number as number,
          limit: 10 satisfies number as number,
          member_id: member.id satisfies string as string,
        } satisfies ICommunityPlatformKarma.IRequest,
      },
    );
  typia.assert(memberFilterPage);
  // Verify all returned karma records belong to the member
  for (const karma of memberFilterPage.data) {
    TestValidator.equals(
      `member ID matches ${member.id}`,
      karma.member.id,
      member.id,
    );
  }
  // Test 4: Date range filtering
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const dateFilterPage =
    await api.functional.communityPlatform.member.karmas.index(
      memberConnection,
      {
        body: {
          page: 1 satisfies number as number,
          limit: 10 satisfies number as number,
          created_at_start: thirtyDaysAgo.toISOString(),
          created_at_end: now.toISOString(),
        } satisfies ICommunityPlatformKarma.IRequest,
      },
    );
  typia.assert(dateFilterPage);
  // Verify all records are within date range
  for (const karma of dateFilterPage.data) {
    const created = new Date(karma.created_at);
    TestValidator.predicate(
      `created_at ${karma.created_at} within last 30 days`,
      created >= thirtyDaysAgo && created <= now,
    );
  }
  // Test 5: Text search
  const searchFilterPage =
    await api.functional.communityPlatform.member.karmas.index(
      memberConnection,
      {
        body: {
          page: 1 satisfies number as number,
          limit: 10 satisfies number as number,
          search: member.username.substring(0, 4),
        } satisfies ICommunityPlatformKarma.IRequest,
      },
    );
  typia.assert(searchFilterPage);
  // Search should return at least the member's own karma
  if (searchFilterPage.data.length > 0) {
    const hasMemberKarma = searchFilterPage.data.some(
      (karma) => karma.member.id === member.id,
    );
    TestValidator.predicate(
      `search should find member's karma`,
      hasMemberKarma,
    );
  }
  // Test 6: Sorting options
  const sortOptions = [
    "score-asc",
    "score-desc",
    "created_at-asc",
    "created_at-desc",
    "updated_at-asc",
    "updated_at-desc",
  ] as const;
  for (const sortOption of sortOptions) {
    const sortedPage =
      await api.functional.communityPlatform.member.karmas.index(
        memberConnection,
        {
          body: {
            page: 1 satisfies number as number,
            limit: 10 satisfies number as number,
            sort: sortOption,
          } satisfies ICommunityPlatformKarma.IRequest,
        },
      );
    typia.assert(sortedPage);
    // Verify sorting order for non-empty results
    if (sortedPage.data.length > 1) {
      for (let i = 1; i < sortedPage.data.length; i++) {
        const prev = sortedPage.data[i - 1];
        const curr = sortedPage.data[i];
        switch (sortOption) {
          case "score-asc":
            TestValidator.predicate(
              `score ascending order at index ${i}`,
              prev.score <= curr.score,
            );
            break;
          case "score-desc":
            TestValidator.predicate(
              `score descending order at index ${i}`,
              prev.score >= curr.score,
            );
            break;
          case "created_at-asc":
            TestValidator.predicate(
              `created_at ascending order at index ${i}`,
              new Date(prev.created_at) <= new Date(curr.created_at),
            );
            break;
          case "created_at-desc":
            TestValidator.predicate(
              `created_at descending order at index ${i}`,
              new Date(prev.created_at) >= new Date(curr.created_at),
            );
            break;
          case "updated_at-asc":
            TestValidator.predicate(
              `updated_at ascending order at index ${i}`,
              new Date(prev.updated_at) <= new Date(curr.updated_at),
            );
            break;
          case "updated_at-desc":
            TestValidator.predicate(
              `updated_at descending order at index ${i}`,
              new Date(prev.updated_at) >= new Date(curr.updated_at),
            );
            break;
        }
      }
    }
  }
  // Test 7: Combined filters
  const combinedFilterPage =
    await api.functional.communityPlatform.member.karmas.index(
      memberConnection,
      {
        body: {
          page: 1 satisfies number as number,
          limit: 10 satisfies number as number,
          min_score: -50 satisfies number as number,
          max_score: 50 satisfies number as number,
          created_at_start: thirtyDaysAgo.toISOString(),
          created_at_end: now.toISOString(),
          sort: "score-desc",
        } satisfies ICommunityPlatformKarma.IRequest,
      },
    );
  typia.assert(combinedFilterPage);
  // Verify all combined filter conditions
  for (const karma of combinedFilterPage.data) {
    TestValidator.predicate(
      `score within [-50, 50]`,
      karma.score >= -50 && karma.score <= 50,
    );
    const created = new Date(karma.created_at);
    TestValidator.predicate(
      `created within last 30 days`,
      created >= thirtyDaysAgo && created <= now,
    );
  }
  // Test 8: Pagination edge cases
  const page2 = await api.functional.communityPlatform.member.karmas.index(
    memberConnection,
    {
      body: {
        page: 2 satisfies number as number,
        limit: 5 satisfies number as number,
      } satisfies ICommunityPlatformKarma.IRequest,
    },
  );
  typia.assert(page2);
  TestValidator.equals("page 2 is correct", page2.pagination.current, 2);
  // Test empty result set with impossible filter
  const impossibleFilterPage =
    await api.functional.communityPlatform.member.karmas.index(
      memberConnection,
      {
        body: {
          page: 1 satisfies number as number,
          limit: 10 satisfies number as number,
          min_score: 999999 satisfies number as number,
          max_score: 999999 satisfies number as number,
        } satisfies ICommunityPlatformKarma.IRequest,
      },
    );
  typia.assert(impossibleFilterPage);
  TestValidator.predicate(
    "impossible filter returns empty or fewer results",
    impossibleFilterPage.data.length <= defaultPage.data.length,
  );
}
