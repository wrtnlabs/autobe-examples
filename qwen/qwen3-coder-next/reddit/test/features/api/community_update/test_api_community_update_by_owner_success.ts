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

export async function test_api_community_update_by_owner_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and login as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
    },
  });
  // 2. Create a community to become the owner
  const communityName = `test_community_${RandomGenerator.alphaNumeric(8)}`;
  const createdCommunity =
    await generate_random_reddit_like_member_communities_create(
      memberConnection,
      {
        body: {
          name: communityName,
          icon_url: RandomGenerator.pick([
            "https://example.com/icon.png",
            null,
          ]) as any,
        },
      },
    );
  typia.assert(createdCommunity);
  // 3. Update community description and icon_url
  const newIconUrl = RandomGenerator.pick([
    "https://example.com/new-icon.png",
    null,
  ]) as any;
  const updatedCommunity =
    await api.functional.redditLike.member.communities.update(
      memberConnection,
      {
        communityName,
        body: {
          icon_url: newIconUrl,
        },
      },
    );
  typia.assert(updatedCommunity);
  // 4. Verify the update was applied correctly
  TestValidator.equals("name unchanged", updatedCommunity.name, communityName);
  TestValidator.equals(
    "icon_url updated",
    updatedCommunity.icon_url,
    newIconUrl,
  );
  // 5. Verify timestamp changed
  TestValidator.predicate(
    "updated_at changed",
    () => updatedCommunity.updated_at !== createdCommunity.updated_at,
  );
}
