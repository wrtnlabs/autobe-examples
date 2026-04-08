import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_subscriptions_create } from "../../../generate/generate_random_reddit_community_member_subscriptions_create";
import { prepare_random_reddit_community_subscription } from "../../../prepare/prepare_random_reddit_community_subscription";

export async function test_api_community_feed_empty(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Join as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Use a test community ID (community exists but has no posts)
  const testCommunityId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Subscribe the member to the community
  await generate_random_reddit_community_member_subscriptions_create(
    memberConnection,
    {
      body: {
        reddit_community_communities_id: testCommunityId,
      },
    },
  );
  // 4. Make PATCH request to get community feeds with sort=new
  const response: IPageIRedditCommunityPost.ISummary =
    await api.functional.redditCommunity.member.feeds.community.index(
      memberConnection,
      {
        communityId: testCommunityId,
        body: {
          sort: "new",
        } satisfies IRedditCommunityPost.IRequest,
      },
    );
  typia.assert(response);
  // 5. Verify data array is empty (no posts returned)
  TestValidator.equals("data array is empty", response.data.length, 0);
  // 6. Verify pagination metadata
  TestValidator.equals("pagination records=0", response.pagination.records, 0);
  TestValidator.equals("pagination pages=0", response.pagination.pages, 0);
  TestValidator.equals("pagination current=1", response.pagination.current, 1);
  TestValidator.equals(
    "pagination limit=default",
    response.pagination.limit,
    100,
  );
  // 7. Verify the response structure is valid even with empty data
  TestValidator.predicate(
    "has valid pagination structure",
    () =>
      response.pagination !== undefined &&
      typeof response.pagination.records === "number" &&
      typeof response.pagination.pages === "number",
  );
}
