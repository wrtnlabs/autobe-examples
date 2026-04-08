import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_popular_feed_sort_options(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(joinResult);
  // 2. Login as the member
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_member_login(loginConnection, {
    body: {
      email: joinResult.email,
      password: "TestPassword123!",
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies IRedditCommunityMember.ILogin,
  });
  typia.assert(loginResult);
  // 3. Create member-specific connection with token
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = {
    Authorization: `Bearer ${loginResult.token.access}`,
  };
  // 4. Test sort option: 'new'
  const newSortResult =
    await api.functional.redditCommunity.member.feeds.popular.index(
      memberConnection,
      {
        body: {
          sort: "new",
          limit: 20,
          page: 1,
        } satisfies IRedditCommunityPost.IRequest,
      },
    );
  typia.assert(newSortResult);
  // 5. Test sort option: 'top'
  const topSortResult =
    await api.functional.redditCommunity.member.feeds.popular.index(
      memberConnection,
      {
        body: {
          sort: "top",
          limit: 20,
          page: 1,
        } satisfies IRedditCommunityPost.IRequest,
      },
    );
  typia.assert(topSortResult);
  // 6. Test sort option: 'controversial'
  const controversialSortResult =
    await api.functional.redditCommunity.member.feeds.popular.index(
      memberConnection,
      {
        body: {
          sort: "controversial",
          limit: 20,
          page: 1,
        } satisfies IRedditCommunityPost.IRequest,
      },
    );
  typia.assert(controversialSortResult);
  // 7. Verify pagination metadata is present
  TestValidator.equals(
    "new sort pagination present",
    newSortResult.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "top sort pagination present",
    topSortResult.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "controversial sort pagination present",
    controversialSortResult.pagination !== undefined,
    true,
  );
  // 8. Verify pagination structure
  TestValidator.equals(
    "new sort pagination current",
    newSortResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "new sort pagination limit",
    newSortResult.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "new sort pagination records non-negative",
    () => newSortResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "new sort pagination pages non-negative",
    () => newSortResult.pagination.pages >= 0,
  );
  // 9. Verify response structure - data array type
  typia.assert(newSortResult.data);
  typia.assert(topSortResult.data);
  typia.assert(controversialSortResult.data);
  // 10. Verify data items have required fields
  if (newSortResult.data.length > 0) {
    const firstNewPost = newSortResult.data[0];
    typia.assert(firstNewPost);
    TestValidator.equals(
      "new sort post has id",
      firstNewPost.id !== undefined,
      true,
    );
    TestValidator.equals(
      "new sort post has title",
      firstNewPost.title !== undefined,
      true,
    );
    TestValidator.equals(
      "new sort post has post_type",
      firstNewPost.post_type !== undefined,
      true,
    );
    TestValidator.equals(
      "new sort post has vote_score",
      firstNewPost.vote_score !== undefined,
      true,
    );
    TestValidator.equals(
      "new sort post has created_at",
      firstNewPost.created_at !== undefined,
      true,
    );
    TestValidator.equals(
      "new sort post has author",
      firstNewPost.author !== undefined,
      true,
    );
    TestValidator.equals(
      "new sort post has community",
      firstNewPost.community !== undefined,
      true,
    );
  }
  // 11. Test default sort (no sort specified) - should default to 'hot'
  const defaultSortResult =
    await api.functional.redditCommunity.member.feeds.popular.index(
      memberConnection,
      {
        body: {
          limit: 20,
          page: 1,
        } satisfies IRedditCommunityPost.IRequest,
      },
    );
  typia.assert(defaultSortResult);
  TestValidator.equals(
    "default sort pagination present",
    defaultSortResult.pagination !== undefined,
    true,
  );
  // 12. Test timePeriod filter with top sort (should not error)
  const topWithTimePeriodResult =
    await api.functional.redditCommunity.member.feeds.popular.index(
      memberConnection,
      {
        body: {
          sort: "top",
          timePeriod: "this_week",
          limit: 20,
          page: 1,
        } satisfies IRedditCommunityPost.IRequest,
      },
    );
  typia.assert(topWithTimePeriodResult);
  TestValidator.equals(
    "top with timePeriod pagination present",
    topWithTimePeriodResult.pagination !== undefined,
    true,
  );
}
