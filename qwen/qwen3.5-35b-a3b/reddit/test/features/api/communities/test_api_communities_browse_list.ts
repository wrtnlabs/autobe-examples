import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommunity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";

export async function test_api_communities_browse_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const authMember = await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.alphaNumeric(10),
      password: memberPassword,
      displayName: RandomGenerator.name(1),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarUrl: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(authMember);
  typia.assert(authMember.user);
  // 2. Create 5 test communities with varying names
  // Note: memberConnection already has auth token from authorize_member_join
  const communities: IRedditPlatformCommunity[] = [];
  // Create community 1
  const community1 =
    await generate_random_reddit_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: "technews",
          description: "Technology news and updates",
          icon_url: null,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community1);
  communities.push(community1);
  // Create community 2
  const community2 =
    await generate_random_reddit_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: "javascript",
          description: "JavaScript programming community",
          icon_url: null,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community2);
  communities.push(community2);
  // Create community 3
  const community3 =
    await generate_random_reddit_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: "reactdev",
          description: "React development discussions",
          icon_url: null,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community3);
  communities.push(community3);
  // Create community 4
  const community4 =
    await generate_random_reddit_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: "typescript",
          description: "TypeScript language and ecosystem",
          icon_url: null,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community4);
  communities.push(community4);
  // Create community 5
  const community5 =
    await generate_random_reddit_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: "webdev",
          description: "Web development general discussion",
          icon_url: null,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community5);
  communities.push(community5);
  // 3a. Test with no filters - get all communities
  const allCommunitiesResponse =
    await api.functional.redditPlatform.communities.index(connection, {
      body: {},
    });
  typia.assert(allCommunitiesResponse);
  TestValidator.equals(
    "total communities",
    allCommunitiesResponse.data.length,
    5,
  );
  // 3b. Test search query - case-insensitive partial matching
  const searchResults = await api.functional.redditPlatform.communities.index(
    connection,
    {
      body: { searchQuery: "tech" },
    },
  );
  typia.assert(searchResults);
  if (searchResults.data.length > 0) {
    for (const community of searchResults.data) {
      TestValidator.predicate(
        "search result name contains query",
        community.name.toLowerCase().includes("tech"),
      );
    }
  }
  // 3c. Test sorting by different criteria
  const sortedByName = await api.functional.redditPlatform.communities.index(
    connection,
    {
      body: { sortBy: "name", sortOrder: "asc" },
    },
  );
  typia.assert(sortedByName);
  const sortedNames = sortedByName.data.map((c) => c.name);
  TestValidator.predicate(
    "names are sorted ascending",
    sortedNames.every((name, i) => i === 0 || sortedNames[i - 1] <= name),
  );
  const sortedByCreatedDesc =
    await api.functional.redditPlatform.communities.index(connection, {
      body: { sortBy: "created_at", sortOrder: "desc" },
    });
  typia.assert(sortedByCreatedDesc);
  const sortedByCreatedAsc =
    await api.functional.redditPlatform.communities.index(connection, {
      body: { sortBy: "created_at", sortOrder: "asc" },
    });
  typia.assert(sortedByCreatedAsc);
  const sortedBySubscribers =
    await api.functional.redditPlatform.communities.index(connection, {
      body: { sortBy: "subscriber_count", sortOrder: "desc" },
    });
  typia.assert(sortedBySubscribers);
  // 3d. Test pagination
  const paginatedPage1 = await api.functional.redditPlatform.communities.index(
    connection,
    {
      body: { page: 1, limit: 2 },
    },
  );
  typia.assert(paginatedPage1);
  TestValidator.equals("page 1 data length", paginatedPage1.data.length, 2);
  TestValidator.equals("page 1 current", paginatedPage1.pagination.current, 1);
  TestValidator.equals("page 1 limit", paginatedPage1.pagination.limit, 2);
  TestValidator.equals(
    "page 1 total records",
    paginatedPage1.pagination.records,
    5,
  );
  TestValidator.equals(
    "page 1 total pages",
    paginatedPage1.pagination.pages,
    3,
  );
  const paginatedPage2 = await api.functional.redditPlatform.communities.index(
    connection,
    {
      body: { page: 2, limit: 2 },
    },
  );
  typia.assert(paginatedPage2);
  TestValidator.equals("page 2 current", paginatedPage2.pagination.current, 2);
  const paginatedPage3 = await api.functional.redditPlatform.communities.index(
    connection,
    {
      body: { page: 3, limit: 2 },
    },
  );
  typia.assert(paginatedPage3);
  TestValidator.equals(
    "page 3 last page",
    paginatedPage3.pagination.current,
    3,
  );
  const paginatedLargeLimit =
    await api.functional.redditPlatform.communities.index(connection, {
      body: { page: 1, limit: 10 },
    });
  typia.assert(paginatedLargeLimit);
  TestValidator.equals(
    "large limit returns all",
    paginatedLargeLimit.data.length,
    5,
  );
}
