import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunity";
import type { IPageIRedditLikeSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeSubscription";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_retrieves_subscribed_communities(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(8),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: null,
      avatar_url: null,
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(member);
  // 2. Subscribe to multiple communities
  const communities = ArrayUtil.repeat(3, (i) => ({
    name: `community_${i}_${RandomGenerator.alphaNumeric(6)}`,
  }));
  const subscriptions = await Promise.all(
    communities.map(async (community) => {
      const subscription =
        await api.functional.redditLike.member.communities.subscribe.create(
          memberConnection,
          {
            communityName: community.name,
          },
        );
      typia.assert(subscription);
      return subscription;
    }),
  );
  // 3. Retrieve subscribed communities
  const response =
    await api.functional.redditLike.member.users.me.subscribed_communities.index(
      memberConnection,
    );
  typia.assert(response);
  // 4. Validate response
  // Validate pagination structure exists and has correct types
  TestValidator.predicate(
    "pagination has current",
    typeof response.pagination.current === "number",
  );
  TestValidator.predicate(
    "pagination has limit",
    typeof response.pagination.limit === "number",
  );
  TestValidator.predicate(
    "pagination has records",
    typeof response.pagination.records === "number",
  );
  TestValidator.predicate(
    "pagination has pages",
    typeof response.pagination.pages === "number",
  );
  // Validate data array exists
  TestValidator.predicate("has data array", Array.isArray(response.data));
  TestValidator.equals(
    "correct number of communities",
    response.data.length,
    3,
  );
  // Validate each community structure
  for (const community of response.data) {
    typia.assert<IRedditLikeCommunity.ISummary>(community);
    TestValidator.predicate(
      "has valid id",
      typeof community.id === "string" && community.id.length > 0,
    );
    TestValidator.predicate(
      "has name",
      typeof community.name === "string" && community.name.length > 0,
    );
    TestValidator.predicate(
      "has created_at",
      typeof community.created_at === "string",
    );
  }
  // Validate that all subscribed communities are present
  const communityNames = response.data.map((c) => c.name);
  for (const community of communities) {
    TestValidator.predicate(
      "community subscribed",
      communityNames.includes(community.name),
    );
  }
}
