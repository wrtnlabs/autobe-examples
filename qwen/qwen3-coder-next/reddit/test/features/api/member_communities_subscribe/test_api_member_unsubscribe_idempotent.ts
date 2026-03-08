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

export async function test_api_member_unsubscribe_idempotent(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and login as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphaNumeric(8),
    password: "12345678",
    display_name: RandomGenerator.name(),
    bio: null,
    avatar_url: null,
  } satisfies IRedditLikeMember.IJoin;
  const memberAuthorized = await authorize_member_join(memberConnection, {
    body: memberData,
  });
  typia.assert(memberAuthorized);
  // 2. Use a randomly generated community name for testing
  const communityName = `test-community-${RandomGenerator.alphaNumeric(6)}`;
  // 3. First subscribe to create the subscription
  const subscription1 =
    await api.functional.redditLike.member.communities.subscribe.create(
      memberConnection,
      {
        communityName,
      },
    );
  typia.assert(subscription1);
  // 4. First unsubscribe - should succeed (returns 204)
  await api.functional.redditLike.member.communities.subscribe.unsubscribe(
    memberConnection,
    {
      communityName,
    },
  );
  // 5. Second unsubscribe - should also succeed (idempotent behavior)
  // This is the key test: calling unsubscribe on already unsubscribed should not error
  await api.functional.redditLike.member.communities.subscribe.unsubscribe(
    memberConnection,
    {
      communityName,
    },
  );
  // 6. Third unsubscribe - verify it's still idempotent
  await api.functional.redditLike.member.communities.subscribe.unsubscribe(
    memberConnection,
    {
      communityName,
    },
  );
  // 7. Verify that trying to subscribe again creates a new subscription
  const newSubscription =
    await api.functional.redditLike.member.communities.subscribe.create(
      memberConnection,
      {
        communityName,
      },
    );
  typia.assert(newSubscription);
  // 8. Clean up - unsubscribe from the community
  await api.functional.redditLike.member.communities.subscribe.unsubscribe(
    memberConnection,
    {
      communityName,
    },
  );
}
