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

/**
 * Test successful community unsubscribe flow.
 * 1. Member registers and joins the system
 * 2. Member subscribes to a community
 * 3. Member successfully unsubscribes from the community
 * 4. Verify the unsubscribe operation completes successfully
 */
export async function test_api_member_unsubscribe_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Member registration
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(8),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: null,
      avatar_url: null,
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(memberAuth);
  // Step 2: Create a community for testing
  const communityName = `test-community-${RandomGenerator.alphaNumeric(6)}`;
  // Step 3: Subscribe to the community
  const subscription =
    await api.functional.redditLike.member.communities.subscribe.create(
      memberConnection,
      {
        communityName: communityName,
      },
    );
  typia.assert(subscription);
  TestValidator.equals(
    "subscription status is subscribed",
    subscription.status,
    "subscribed",
  );
  // Step 4: Unsubscribe from the community
  await api.functional.redditLike.member.communities.subscribe.unsubscribe(
    memberConnection,
    {
      communityName: communityName,
    },
  );
  // Step 5: Verify unsubscription by re-subscribing (should work again)
  const resubscription =
    await api.functional.redditLike.member.communities.subscribe.create(
      memberConnection,
      {
        communityName: communityName,
      },
    );
  typia.assert(resubscription);
  TestValidator.equals(
    "resubscription status is subscribed",
    resubscription.status,
    "subscribed",
  );
}
