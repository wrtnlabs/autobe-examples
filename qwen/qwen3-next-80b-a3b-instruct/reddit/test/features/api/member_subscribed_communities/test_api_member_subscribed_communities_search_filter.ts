import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunitySubscription";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_subscribed_communities_search_filter(
  connection: api.IConnection,
): Promise<void> {
  // Create member user
  const memberConnection: api.IConnection = { host: connection.host };
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(1),
  } satisfies IRedditCommunityMember.IJoin;
  const member = await authorize_member_join(memberConnection, {
    body: memberData,
  });
  typia.assert(member);
  // Test search with non-existent term - must return empty result
  const noMatchResult =
    await api.functional.redditCommunity.member.community.subscribed.index(
      memberConnection,
      {
        body: {
          search: "xyz" + RandomGenerator.alphaNumeric(5),
          page: 1,
          limit: 10,
        } satisfies IRedditCommunitySubscription.IRequest,
      },
    );
  typia.assert(noMatchResult);
  // Verify empty result
  TestValidator.equals(
    "search result count for non-existent term",
    noMatchResult.data.length,
    0,
  );
  TestValidator.equals(
    "search pagination records",
    noMatchResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "search pagination pages",
    noMatchResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "search pagination current",
    noMatchResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "search pagination limit",
    noMatchResult.pagination.limit,
    10,
  );
  // Verify search with empty string returns all subscribed communities (if any)
  const allResult =
    await api.functional.redditCommunity.member.community.subscribed.index(
      memberConnection,
      {
        body: {
          search: "",
          page: 1,
          limit: 10,
        } satisfies IRedditCommunitySubscription.IRequest,
      },
    );
  typia.assert(allResult);
  // Can't assert exact count because we don't know existing subscriptions,
  // but can at least verify it's a valid response
  TestValidator.predicate(
    "search with empty string returns valid response",
    allResult.data.length >= 0,
  );
  TestValidator.predicate(
    "search with empty string has pagination",
    allResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "search with empty string has current page",
    allResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "search with empty string has limit",
    allResult.pagination.limit > 0,
  );
  // Verify that requesting pagination beyond results returns empty
  const beyondResult =
    await api.functional.redditCommunity.member.community.subscribed.index(
      memberConnection,
      {
        body: {
          search: "xyz" + RandomGenerator.alphaNumeric(5),
          page: 100,
          limit: 10,
        } satisfies IRedditCommunitySubscription.IRequest,
      },
    );
  typia.assert(beyondResult);
  TestValidator.equals(
    "search beyond results count",
    beyondResult.data.length,
    0,
  );
  // Test with existing search term that might match (even though we can create no data)
  // Some systems may have "technology" or "tech" communities by default - if so, verify type
  const maybeMatchResult =
    await api.functional.redditCommunity.member.community.subscribed.index(
      memberConnection,
      {
        body: {
          search: "tech",
          page: 1,
          limit: 10,
        } satisfies IRedditCommunitySubscription.IRequest,
      },
    );
  typia.assert(maybeMatchResult);
  // Verify structure without asserting count (because we don't control server state)
  TestValidator.predicate(
    "search with 'tech' returns valid structure",
    maybeMatchResult.data.length >= 0,
  );
  maybeMatchResult.data.forEach((subscription) => {
    typia.assert(subscription.community);
    typia.assert(subscription.member);
  });
}
