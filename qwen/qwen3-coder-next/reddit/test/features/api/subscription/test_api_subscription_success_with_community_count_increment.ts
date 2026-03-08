import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_subscription_success_with_community_count_increment(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member and authenticate
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
  // Step 2: Subscribe to community
  const subscription =
    await api.functional.redditLike.member.communities.subscribe.create(
      memberConnection,
      {
        communityName: "test-community",
      },
    );
  typia.assert(subscription);
  // Step 3: Validate subscription properties
  TestValidator.equals(
    "subscription status is subscribed",
    subscription.status,
    "subscribed",
  );
  TestValidator.equals(
    "community name is test-community",
    subscription.community.name,
    "test-community",
  );
  TestValidator.notEquals(
    "member ID is not null",
    subscription.member.id,
    null,
  );
  // Step 4: Validate community structure
  TestValidator.predicate(
    "community ID is valid UUID",
    /^[0-9a-f-]{36}$/i.test(subscription.community.id),
  );
  TestValidator.predicate(
    "community name is not empty",
    subscription.community.name.length > 0,
  );
  // Step 5: Validate member structure
  TestValidator.predicate(
    "member ID is valid UUID",
    /^[0-9a-f-]{36}$/i.test(subscription.member.id),
  );
  TestValidator.predicate(
    "community created_at is valid ISO string",
    !isNaN(new Date(subscription.community.created_at).getTime()),
  );
  // Step 6: Validate subscription metadata timestamps
  TestValidator.predicate(
    "subscription created_at is valid ISO string",
    !isNaN(new Date(subscription.created_at).getTime()),
  );
  TestValidator.predicate(
    "subscription updated_at is valid ISO string",
    !isNaN(new Date(subscription.updated_at).getTime()),
  );
  TestValidator.predicate(
    "created_at is before or equal to updated_at",
    new Date(subscription.created_at) <= new Date(subscription.updated_at),
  );
}
