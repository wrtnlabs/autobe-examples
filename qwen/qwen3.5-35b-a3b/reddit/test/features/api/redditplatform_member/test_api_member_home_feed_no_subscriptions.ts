import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_home_feed_no_subscriptions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new member account via join endpoint
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(joinResponse);
  // 2. Member has no subscriptions - we never subscribed to any community
  // This is intentional - create member and leave subscriptions empty
  // 3. Call home feed endpoint with default parameters (sort='hot', page=1, limit=20)
  const feedRequest = {
    page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
    sort: "hot" satisfies "hot" | "new" | "top" | "controversial",
  } satisfies IRedditPlatformPost.IRequest;
  const feedResponse =
    await api.functional.redditPlatform.member.users.me.activity.index(
      memberConnection,
      {
        body: feedRequest,
      },
    );
  typia.assert(feedResponse);
  // 4. Validate that the data array is empty (member has no subscriptions)
  TestValidator.equals("feed data is empty", feedResponse.data.length, 0);
  // 5. Check that pagination metadata shows 0 total records
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
    "pagination current is 1",
    feedResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 20",
    feedResponse.pagination.limit,
    20,
  );
  // 6. Verify that the system handles empty subscription case gracefully
  // Member can still access their feed endpoint successfully
  TestValidator.predicate(
    "member identity is valid",
    () => joinResponse.id !== undefined && joinResponse.username.length > 0,
  );
}
