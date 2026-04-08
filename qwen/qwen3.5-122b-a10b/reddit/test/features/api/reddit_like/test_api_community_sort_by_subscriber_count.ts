import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunity";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_community_sort_by_subscriber_count(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account for authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(member);
  // 2. Test descending order sorting by subscriber_count
  const descResult = await api.functional.redditLike.member.communities.index(
    memberConnection,
    {
      body: {
        sort_by: "subscriber_count",
        sort_order: "desc",
        limit: 10,
      } satisfies IRedditLikeCommunity.IRequest,
    },
  );
  typia.assert(descResult);
  // Verify pagination metadata is valid
  TestValidator.predicate(
    "pagination current page should be >= 0",
    descResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit should be >= 0",
    descResult.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records should be >= 0",
    descResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be >= 0",
    descResult.pagination.pages >= 0,
  );
  // Verify descending order
  for (let i = 1; i < descResult.data.length; i++) {
    TestValidator.predicate(
      `community ${i} should have <= subscriber count than community ${i - 1}`,
      descResult.data[i].subscriber_count <=
        descResult.data[i - 1].subscriber_count,
    );
  }
  // 3. Test ascending order sorting by subscriber_count
  const ascResult = await api.functional.redditLike.member.communities.index(
    memberConnection,
    {
      body: {
        sort_by: "subscriber_count",
        sort_order: "asc",
        limit: 10,
      } satisfies IRedditLikeCommunity.IRequest,
    },
  );
  typia.assert(ascResult);
  // Verify ascending order
  for (let i = 1; i < ascResult.data.length; i++) {
    TestValidator.predicate(
      `community ${i} should have >= subscriber count than community ${i - 1}`,
      ascResult.data[i].subscriber_count >=
        ascResult.data[i - 1].subscriber_count,
    );
  }
  // 4. Test sorting with pagination
  const page1Result = await api.functional.redditLike.member.communities.index(
    memberConnection,
    {
      body: {
        sort_by: "subscriber_count",
        sort_order: "desc",
        page: 1,
        limit: 5,
      } satisfies IRedditLikeCommunity.IRequest,
    },
  );
  typia.assert(page1Result);
  const page2Result = await api.functional.redditLike.member.communities.index(
    memberConnection,
    {
      body: {
        sort_by: "subscriber_count",
        sort_order: "desc",
        page: 2,
        limit: 5,
      } satisfies IRedditLikeCommunity.IRequest,
    },
  );
  typia.assert(page2Result);
  // Verify pagination maintains sort order (only if both pages have data)
  if (page1Result.data.length > 0 && page2Result.data.length > 0) {
    TestValidator.predicate(
      "last item of page 1 should have >= subscriber count than first item of page 2",
      page1Result.data[page1Result.data.length - 1].subscriber_count >=
        page2Result.data[0].subscriber_count,
    );
  }
  // 5. Test sorting with search filter
  const searchResult = await api.functional.redditLike.member.communities.index(
    memberConnection,
    {
      body: {
        search: "o",
        sort_by: "subscriber_count",
        sort_order: "desc",
        limit: 10,
      } satisfies IRedditLikeCommunity.IRequest,
    },
  );
  typia.assert(searchResult);
  // Verify search results are still sorted correctly
  for (let i = 1; i < searchResult.data.length; i++) {
    TestValidator.predicate(
      `search result ${i} should have <= subscriber count than result ${i - 1}`,
      searchResult.data[i].subscriber_count <=
        searchResult.data[i - 1].subscriber_count,
    );
  }
  // 6. Verify subscriber_count values are non-negative for all communities
  for (const community of descResult.data) {
    TestValidator.predicate(
      `subscriber_count should be non-negative for ${community.name}`,
      community.subscriber_count >= 0,
    );
  }
}
