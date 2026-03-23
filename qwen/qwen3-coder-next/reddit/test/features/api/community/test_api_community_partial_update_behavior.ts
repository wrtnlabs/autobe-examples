import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";

export async function test_api_community_partial_update_behavior(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberInfo = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarUrl: null,
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(memberInfo);
  // 2. Create community with initial data (icon_url omitted)
  const communityName = RandomGenerator.alphabets(8);
  const createdCommunity =
    await api.functional.redditLike.member.communities.create(
      memberConnection,
      {
        body: {
          name: communityName,
        } satisfies IRedditLikeCommunity.ICreate,
      },
    );
  typia.assert(createdCommunity);
  // 3. Verify initial state - icon_url should be null/undefined
  TestValidator.equals(
    "icon_url is null/undefined initially",
    createdCommunity.icon_url,
    null,
  );
  // 4. Update icon_url
  const newIconUrl = "https://example.com/new-icon.png" as string &
    tags.Format<"uri">;
  const updateIconResult =
    await api.functional.redditLike.member.communities.update(
      memberConnection,
      {
        communityName: createdCommunity.name,
        body: {
          icon_url: newIconUrl,
        } satisfies IRedditLikeCommunity.IUpdate,
      },
    );
  typia.assert(updateIconResult);
  // 5. Verify icon_url changed
  TestValidator.equals(
    "icon_url updated",
    updateIconResult.icon_url,
    newIconUrl,
  );
  // 6. Verify timestamp behavior
  const timestamp1 = new Date(createdCommunity.updated_at).getTime();
  const timestamp2 = new Date(updateIconResult.updated_at).getTime();
  TestValidator.predicate(
    "updated_at refreshed on update",
    timestamp2 > timestamp1,
  );
}
