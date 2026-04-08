import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommunity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_community_search_sorting_options(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register test member for authenticated requests
  const memberConnection: api.IConnection = { host: connection.host };
  const testMember = await authorize_member_join(memberConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(8)}@test.com`,
      password: RandomGenerator.alphaNumeric(12),
      username: `testuser_${RandomGenerator.alphaNumeric(5)}`,
      href: "https://example.com/signup",
      referrer: "https://example.com",
    },
  });
  typia.assert(testMember);
  // 2. Test all sort combinations
  const sortTests: Array<{
    sortBy: "subscriber_count" | "created_at" | "name";
    sortOrder: "asc" | "desc";
    description: string;
  }> = [
    {
      sortBy: "subscriber_count",
      sortOrder: "desc",
      description: "subscriber count descending (default)",
    },
    {
      sortBy: "subscriber_count",
      sortOrder: "asc",
      description: "subscriber count ascending",
    },
    {
      sortBy: "created_at",
      sortOrder: "desc",
      description: "created date descending (newest first)",
    },
    {
      sortBy: "created_at",
      sortOrder: "asc",
      description: "created date ascending (oldest first)",
    },
    { sortBy: "name", sortOrder: "asc", description: "name ascending (A-Z)" },
    { sortBy: "name", sortOrder: "desc", description: "name descending (Z-A)" },
  ];
  for (const test of sortTests) {
    const searchParams = {
      body: {
        sortBy: test.sortBy,
        sortOrder: test.sortOrder,
        limit: 50,
        page: 1,
      } satisfies IRedditPlatformCommunity.IRequest,
    };
    const result =
      await api.functional.redditPlatform.member.communities.search.index(
        memberConnection,
        searchParams,
      );
    typia.assert(result);
    // Validate pagination metadata
    TestValidator.equals(
      "pagination records count",
      result.pagination.records,
      result.data.length,
    );
    TestValidator.equals(
      "pagination pages calculation",
      result.pagination.pages,
      Math.ceil(result.pagination.records / result.pagination.limit),
    );
    TestValidator.equals(
      "pagination current page",
      result.pagination.current,
      1,
    );
    // Validate result ordering based on sort criteria
    if (result.data.length > 1) {
      switch (test.sortBy) {
        case "subscriber_count": {
          const isCorrectOrder = result.data.every((community, index) => {
            if (index === 0) return true;
            const prev = result.data[index - 1];
            if (test.sortOrder === "desc") {
              return community.subscriber_count <= prev.subscriber_count;
            } else {
              return community.subscriber_count >= prev.subscriber_count;
            }
          });
          TestValidator.predicate(
            `subscriber_count ${test.sortOrder} order`,
            isCorrectOrder,
          );
          break;
        }
        case "created_at": {
          const isCorrectOrder = result.data.every((community, index) => {
            if (index === 0) return true;
            const prev = result.data[index - 1];
            const prevDate = new Date(prev.created_at).getTime();
            const currDate = new Date(community.created_at).getTime();
            if (test.sortOrder === "desc") {
              return currDate <= prevDate;
            } else {
              return currDate >= prevDate;
            }
          });
          TestValidator.predicate(
            `created_at ${test.sortOrder} order`,
            isCorrectOrder,
          );
          break;
        }
        case "name": {
          const isCorrectOrder = result.data.every((community, index) => {
            if (index === 0) return true;
            const prev = result.data[index - 1];
            const comparison = community.name.localeCompare(prev.name);
            if (test.sortOrder === "desc") {
              return comparison <= 0;
            } else {
              return comparison >= 0;
            }
          });
          TestValidator.predicate(
            `name ${test.sortOrder} order`,
            isCorrectOrder,
          );
          break;
        }
      }
    }
    // Validate all required fields are present in results
    for (const community of result.data) {
      typia.assert(community);
      TestValidator.predicate(
        "community has valid subscriber_count",
        community.subscriber_count >= 0,
      );
    }
  }
  // 3. Test pagination with sorting
  // Get first page with subscriber_count desc
  const firstPage =
    await api.functional.redditPlatform.member.communities.search.index(
      memberConnection,
      {
        body: {
          sortBy: "subscriber_count",
          sortOrder: "desc",
          limit: 5,
          page: 1,
        } satisfies IRedditPlatformCommunity.IRequest,
      },
    );
  typia.assert(firstPage);
  // Get second page
  const secondPage =
    await api.functional.redditPlatform.member.communities.search.index(
      memberConnection,
      {
        body: {
          sortBy: "subscriber_count",
          sortOrder: "desc",
          limit: 5,
          page: 2,
        } satisfies IRedditPlatformCommunity.IRequest,
      },
    );
  typia.assert(secondPage);
  TestValidator.equals(
    "pagination page numbers correct",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination page numbers correct",
    secondPage.pagination.current,
    2,
  );
  TestValidator.equals("first page limit", firstPage.pagination.limit, 5);
  TestValidator.equals("second page limit", secondPage.pagination.limit, 5);
  TestValidator.equals(
    "pagination records consistent",
    firstPage.pagination.records,
    secondPage.pagination.records,
  );
  // Validate no duplicate communities across pages
  const allIds = [
    ...firstPage.data.map((c) => c.id),
    ...secondPage.data.map((c) => c.id),
  ];
  const uniqueIds = new Set(allIds);
  TestValidator.equals(
    "no duplicate community IDs across pages",
    uniqueIds.size,
    allIds.length,
  );
}