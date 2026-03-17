import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityFeedQuery } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityFeedQuery";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityFeedQuery } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFeedQuery";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_home_feed_empty_subscriptions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member (no subscriptions will be created)
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Fetch home feed without any subscriptions
  const feedResponse =
    await api.functional.redditCommunity.member.home.feed.index(
      memberConnection,
      {
        body: {
          sortOrder: null,
          timeFilter: null,
          postType: null,
          paginationToken: null,
          pageSize: null,
          page: undefined,
          limit: undefined,
        } satisfies IRedditCommunityFeedQuery.IRequest,
      },
    );
  typia.assert(feedResponse);
  // 3. Validate empty feed response
  TestValidator.equals("feed data is empty array", feedResponse.data, []);
  TestValidator.equals(
    "pagination records is 0",
    feedResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages is 0",
    feedResponse.pagination.pages,
    0,
  );
  TestValidator.equals(
    "pagination current is 1 (first page)",
    feedResponse.pagination.current,
    1,
  );
  // limit should be a positive integer from default server setting
  TestValidator.predicate(
    "pagination limit is positive integer",
    () => feedResponse.pagination.limit > 0,
  );
}
