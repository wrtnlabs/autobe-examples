import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_communities_moderators_add } from "../../../generate/generate_random_reddit_platform_member_communities_moderators_add";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_moderator } from "../../../prepare/prepare_random_reddit_platform_community_moderator";
import { prepare_random_reddit_platform_member } from "../../../prepare/prepare_random_reddit_platform_member";

export async function test_api_community_moderators_list_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create owner member account
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_]+$">
      >(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(ownerAuth);
  // 2. Owner creates a community
  const community =
    await generate_random_reddit_platform_member_communities_create(
      ownerConnection,
      {
        body: {
          name: typia.random<string & tags.MinLength<3>>(),
          description: typia.random<string & tags.MaxLength<1000>>(),
        },
      },
    );
  typia.assert(community);
  // 3. Add first moderator to the community
  const firstModeratorConnection: api.IConnection = { host: connection.host };
  const firstModeratorAuth = await authorize_member_join(
    firstModeratorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<20> &
            tags.Pattern<"^[a-zA-Z0-9_]+$">
        >(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    },
  );
  typia.assert(firstModeratorAuth);
  const firstModerator =
    await generate_random_reddit_platform_member_communities_moderators_add(
      ownerConnection,
      {
        body: {
          user_id: firstModeratorAuth.id,
        },
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(firstModerator);
  // 4. Add second moderator to the community
  const secondModeratorConnection: api.IConnection = { host: connection.host };
  const secondModeratorAuth = await authorize_member_join(
    secondModeratorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<20> &
            tags.Pattern<"^[a-zA-Z0-9_]+$">
        >(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    },
  );
  typia.assert(secondModeratorAuth);
  const secondModerator =
    await generate_random_reddit_platform_member_communities_moderators_add(
      ownerConnection,
      {
        body: {
          user_id: secondModeratorAuth.id,
        },
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(secondModerator);
  // 5. List moderators using owner connection
  const moderatorsList = typia.assert<IRedditPlatformCommunityModerator[]>(
    await api.functional.redditPlatform.communities.moderators.list(
      ownerConnection,
      {
        communityId: community.id,
      },
    ),
  );
  // 6. Validate the response
  TestValidator.equals(
    "moderators list is array",
    Array.isArray(moderatorsList),
    true,
  );
  // Check that we have exactly 2 moderators
  TestValidator.equals("moderator count", moderatorsList.length, 2);
  // Check sorting: first moderator should have earlier created_at (ascending order)
  if (moderatorsList.length >= 2) {
    TestValidator.predicate(
      "moderators sorted by appointment date ascending",
      moderatorsList[0].created_at < moderatorsList[1].created_at,
    );
  }
  // Check that each moderator has required profile information
  for (const mod of moderatorsList) {
    TestValidator.equals(
      "moderator has username",
      mod.user.username.length > 0,
      true,
    );
    TestValidator.equals(
      "moderator has display_name",
      mod.user.displayName.length > 0,
      true,
    );
    TestValidator.equals(
      "moderator has karma_score",
      typeof mod.user.karmaScore === "number",
      true,
    );
    TestValidator.equals(
      "moderator has community",
      typeof mod.community.id === "string",
      true,
    );
  }
  // Validate moderator user IDs match expected
  const moderatorIds = moderatorsList.map((m) => m.user.id).sort();
  const expectedIds = [firstModeratorAuth.id, secondModeratorAuth.id].sort();
  TestValidator.equals(
    "moderator user IDs match expected",
    moderatorIds,
    expectedIds,
  );
}