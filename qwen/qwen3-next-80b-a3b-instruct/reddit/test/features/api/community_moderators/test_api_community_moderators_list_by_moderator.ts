import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityOwner";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_community_moderator_join } from "../../../authorize/authorize_community_moderator_join";
import { authorize_community_moderator_login } from "../../../authorize/authorize_community_moderator_login";
import { authorize_community_moderator_refresh } from "../../../authorize/authorize_community_moderator_refresh";
import { authorize_community_owner_join } from "../../../authorize/authorize_community_owner_join";
import { authorize_community_owner_login } from "../../../authorize/authorize_community_owner_login";
import { authorize_community_owner_refresh } from "../../../authorize/authorize_community_owner_refresh";
import { generate_random_reddit_community_community_owner_communities_moderators_create } from "../../../generate/generate_random_reddit_community_community_owner_communities_moderators_create";
import { prepare_random_reddit_community_community_moderator } from "../../../prepare/prepare_random_reddit_community_community_moderator";

export async function test_api_community_moderators_list_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create community owner account
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerPassword = RandomGenerator.alphaNumeric(16);
  const owner = await authorize_community_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: ownerPassword,
      displayName: RandomGenerator.name(),
    },
  });
  typia.assert(owner);
  // 2. Authenticate as community owner
  const ownerAuthConnection: api.IConnection = { host: connection.host };
  const ownerLogin = await authorize_community_owner_login(
    ownerAuthConnection,
    {
      body: {
        email: owner.email,
        password: ownerPassword,
      },
    },
  );
  typia.assert(ownerLogin);
  // 3. Create a community moderator account
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorPassword = (() => {
    let password = RandomGenerator.alphaNumeric(16);
    if (!/[0-9]/.test(password))
      password = password.replace(/[^0-9a-zA-Z]/, "1");
    if (!/[!@#$%^&*]/.test(password))
      password = password.replace(/[^0-9a-zA-Z]/, "!");
    return password;
  })();
  const moderator = await authorize_community_moderator_join(
    moderatorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: moderatorPassword,
        username: RandomGenerator.name(1),
      },
    },
  );
  typia.assert(moderator);
  // 4. Use utility to create a community and assign the moderator in one step
  // This utility function internally creates a community and adds the moderator
  const communityModeratorEntry =
    await generate_random_reddit_community_community_owner_communities_moderators_create(
      ownerAuthConnection,
      {
        body: {
          userId: moderator.id,
        },
        params: {
          communityId: typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  typia.assert(communityModeratorEntry);
  // Extract the communityId from the response
  const communityId = communityModeratorEntry.community.id;
  // 5. Authenticate as community moderator
  const moderatorAuthConnection: api.IConnection = { host: connection.host };
  const moderatorLogin = await authorize_community_moderator_login(
    moderatorAuthConnection,
    {
      body: {
        email: moderator.email,
        password: moderatorPassword,
      },
    },
  );
  typia.assert(moderatorLogin);
  // 6. List moderators of the community as the moderator (tested endpoint)
  // The endpoint returns a single IRedditCommunityModerator, not an array
  const moderatorEntry =
    await api.functional.redditCommunity.communities.moderators.at(
      moderatorAuthConnection,
      {
        communityId: communityId,
      },
    );
  typia.assert(moderatorEntry);
  // Validate response structure and ownership
  TestValidator.predicate("moderator exists", moderatorEntry !== undefined);
  TestValidator.equals(
    "moderator user ID matches",
    moderatorEntry.user.id,
    moderator.id,
  );
  TestValidator.equals(
    "moderator community ID matches",
    moderatorEntry.community.id,
    communityId,
  );
}
