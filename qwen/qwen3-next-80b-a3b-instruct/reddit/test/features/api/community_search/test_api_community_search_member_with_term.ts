import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_community_search_member_with_term(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated member connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  // 2. Search for communities with term 'programming'
  const searchResults =
    await api.functional.redditCommunity.member.communities.search.index(
      memberConnection,
      {
        body: {
          search: "programming",
          page: 1,
          limit: 25,
        } satisfies IRedditCommunityCommunity.IRequest,
      },
    );
  typia.assert(searchResults);
  // 3. Validate pagination metadata
  TestValidator.equals(
    "pagination current",
    searchResults.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", searchResults.pagination.limit, 25);
  TestValidator.predicate(
    "pagination records positive",
    searchResults.pagination.records > 0,
  );
  TestValidator.predicate(
    "pagination pages positive",
    searchResults.pagination.pages > 0,
  );
  // 4. Validate results contain 'programming' in name or description
  TestValidator.predicate(
    "at least one result found",
    searchResults.data.length >= 1,
  );
  for (const community of searchResults.data) {
    TestValidator.predicate(
      "community name or description contains programming",
      community.name.toLowerCase().includes("programming") ||
        community.description.toLowerCase().includes("programming"),
    );
  }
  // 5. Validate sort order by subscriber_count descending
  for (let i = 0; i < searchResults.data.length - 1; i++) {
    const current = searchResults.data[i];
    const next = searchResults.data[i + 1];
    // Check if current has same or higher subscriber count than next
    TestValidator.predicate(
      "communities sorted by subscriber count descending",
      current.subscriber_count >= next.subscriber_count,
    );
  }
}
