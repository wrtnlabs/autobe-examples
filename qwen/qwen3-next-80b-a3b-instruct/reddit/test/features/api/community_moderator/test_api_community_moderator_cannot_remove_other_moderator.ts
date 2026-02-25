import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityOwner";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_community_owner_join } from "../../../authorize/authorize_community_owner_join";
import { authorize_community_owner_login } from "../../../authorize/authorize_community_owner_login";
import { authorize_community_owner_refresh } from "../../../authorize/authorize_community_owner_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_community_owner_communities_moderators_create } from "../../../generate/generate_random_reddit_community_community_owner_communities_moderators_create";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_community_moderator } from "../../../prepare/prepare_random_reddit_community_community_moderator";

export async function test_api_community_moderator_cannot_remove_other_moderator(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as community owner and create account
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_community_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
    },
  });
  // Step 2: Owner creates a new community
  const community =
    await generate_random_reddit_community_member_communities_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  // Step 3: Create two member accounts with explicit password
  const member1Connection: api.IConnection = { host: connection.host };
  const member1Password = RandomGenerator.alphaNumeric(16);
  const member1 = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: member1Password,
      username: RandomGenerator.name(1),
    },
  });
  const member2Connection: api.IConnection = { host: connection.host };
  const member2Password = RandomGenerator.alphaNumeric(16);
  const member2 = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: member2Password,
      username: RandomGenerator.name(1),
    },
  });
  // Step 4: Assign first member as moderator
  await generate_random_reddit_community_community_owner_communities_moderators_create(
    ownerConnection,
    {
      body: {
        userId: member1.id,
      },
      params: {
        communityId: community.id,
      },
    },
  );
  // Step 5: Assign second member as moderator
  await generate_random_reddit_community_community_owner_communities_moderators_create(
    ownerConnection,
    {
      body: {
        userId: member2.id,
      },
      params: {
        communityId: community.id,
      },
    },
  );
  // Step 6: Authenticate as first moderator and attempt to remove second moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(moderatorConnection, {
    body: {
      email: member1.email!,
      password: member1Password,
    },
  });
  // Step 7: Attempt to remove the second moderator - should fail with 403 Forbidden
  await TestValidator.httpError(
    "community moderator cannot remove other moderator",
    403,
    async () => {
      await api.functional.redditCommunity.communityOwner.communities.moderators.erase(
        moderatorConnection,
        {
          communityId: community.id,
          userId: member2.id,
        },
      );
    },
  );
}
