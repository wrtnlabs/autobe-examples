import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import type { ICommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_subscriptions_create } from "../../../generate/generate_random_community_member_subscriptions_create";
import { prepare_random_community_subscription } from "../../../prepare/prepare_random_community_subscription";

export async function test_api_post_feed_home_hot(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new community member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "password123";
  const memberJoinData = {
    email: memberEmail,
    password: memberPassword,
  } satisfies ICommunityMember.IJoin;
  const member = await authorize_member_join(memberConnection, {
    body: memberJoinData,
  });
  typia.assert(member);
  const memberId = member.token.access.match(/sub=([^&]+)/)?.[1] || "";
  // 2. Create two communities (assumed to exist for testing purposes)
  // Since there's no API to create communities, we assume two communities already exist
  // with IDs that can be used for subscription
  const community1Id = "community1_id_" + RandomGenerator.alphaNumeric(10);
  const community2Id = "community2_id_" + RandomGenerator.alphaNumeric(10);
  // 3. Subscribe member to two communities
  const subscription1 =
    await generate_random_community_member_subscriptions_create(
      memberConnection,
      {
        body: { community_id: community1Id, member_id: memberId },
      },
    );
  typia.assert(subscription1);
  const subscription2 =
    await generate_random_community_member_subscriptions_create(
      memberConnection,
      {
        body: { community_id: community2Id, member_id: memberId },
      },
    );
  typia.assert(subscription2);
  // 4. Create a "hot" post in community1 (high recent votes)
  const hotPostData1 = {
    title: "Hot Post in Community 1",
    content: RandomGenerator.paragraph({ sentences: 5 }),
    community_id: community1Id,
    created_at: new Date().toISOString(),
  } satisfies ICommunityPost.IRequest;
  // Note: The provided API doesn't have a POST endpoint to create posts,
  // only PATCH /community/posts to retrieve feeds.
  // This is a structural problem in the system that cannot be solved in E2E test
  // 5. Create an "older" post in community2 (low votes)
  const oldPostData2 = {
    title: "Old Post in Community 2",
    content: RandomGenerator.paragraph({ sentences: 3 }),
    community_id: community2Id,
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  } satisfies ICommunityPost.IRequest;
  // Note: Since there's no way to create posts in the system,
  // we must assume that posts already exist and we're querying for them
  // 6. Query the home feed with hot sort algorithm
  const homeFeed = await api.functional.community.posts.index(
    memberConnection,
    {
      body: { feed_type: "home", sort_algorithm: "hot" },
    },
  );
  typia.assert(homeFeed);
  // 7. Validate the home feed response
  TestValidator.predicate(
    "at least one post returned",
    homeFeed.data.length > 0,
  );
  // Validate pagination info
  TestValidator.equals("current page is 1", homeFeed.pagination.current, 1);
  TestValidator.predicate("limit is positive", homeFeed.pagination.limit > 0);
  TestValidator.predicate(
    "records is non-negative",
    homeFeed.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    homeFeed.pagination.pages >= 0,
  );
  // Validate that all returned posts belong to subscribed communities
  // This requires knowing the community_id for each post, but the ICommunityPost.ISummary
  // definition is empty so we cannot validate this properly
  // However, if the API is correctly implemented, it should filter out posts from unsubscribed communities
  // Since the ICommunityPost.ISummary definition has no properties,
  // we cannot validate specific post content or hot algorithm ordering
  // As per the Anti-Hallucination Protocol, we test only what exists in the schema
  // The only thing we can validate is that the endpoint returns 200 OK and validates the response structure
}
