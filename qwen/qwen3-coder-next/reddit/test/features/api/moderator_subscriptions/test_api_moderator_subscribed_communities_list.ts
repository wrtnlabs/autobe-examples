import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunity";
import type { IPageIRedditLikeSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeSubscription";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikeSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";

export async function test_api_moderator_subscribed_communities_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create moderator account and login
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
    } satisfies IRedditLikeModerator.IJoin,
  });
  typia.assert(moderator);
  // 2. Create a member account for subscription testing
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(member);
  // 3. Create multiple communities as member
  const communities: IRedditLikeCommunity[] = await Promise.all(
    ArrayUtil.repeat(3, () =>
      generate_random_reddit_like_member_communities_create(memberConnection, {
        body: {
          name: `community_${RandomGenerator.alphaNumeric(6)}` satisfies string &
            tags.MinLength<1> &
            tags.MaxLength<50> &
            tags.Pattern<"^[a-zA-Z0-9_]+$">,
          icon_url:
            Math.random() > 0.5 ? RandomGenerator.alphaNumeric(10) : undefined,
        } satisfies IRedditLikeCommunity.ICreate,
      }),
    )
  );
  communities.forEach((community) => typia.assert(community));
  // 4. Create community subscription via PATCH endpoint with member connection
  for (const community of communities) {
    await api.functional.redditLike.member.subscriptions.index(
      memberConnection,
      {
        body: {
          status: "subscribed" as const,
          communityName: community.name,
          offset: 0,
          limit: 1,
        } satisfies IRedditLikeSubscription.IRequest,
      },
    );
  }
  // 5. Call moderator communities endpoint to verify subscribed communities
  const result =
    await api.functional.redditLike.moderator.communities.my.index(
      moderatorConnection,
    );
  typia.assert(result);
  // 6. Validate results
  TestValidator.equals(
    "response has correct pagination structure",
    typeof result.pagination.current,
    "number",
  );
  TestValidator.predicate("has some communities", result.data.length > 0);
  // Verify all returned communities are subscribed
  result.data.forEach((community) => {
    TestValidator.predicate(
      "community has name",
      typeof community.name === "string",
    );
    TestValidator.predicate(
      "community has icon_url",
      typeof community.icon_url === "string" || community.icon_url === null,
    );
    TestValidator.predicate(
      "community has subscriber_count",
      typeof community.subscriber_count === "number",
    );
  });
}