import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityModerator";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_communities_moderators_create } from "../../../generate/generate_random_reddit_clone_member_communities_moderators_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_community_moderator } from "../../../prepare/prepare_random_reddit_clone_community_moderator";

export async function test_api_community_moderator_duplicate_rejection(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test that the system rejects duplicate moderator assignments.
   *
   * 1. Register and authenticate as community owner
   * 2. Register a separate member who will be added as moderator
   * 3. Owner creates a community
   * 4. Owner adds the member as moderator (first attempt - succeeds)
   * 5. Owner attempts to add the same member again (second attempt - fails with 409)
   */
  // 1. Register and authenticate as community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerResult = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(2),
      bio: null,
      avatar_uri: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(ownerResult);
  // 2. Register a separate member who will be added as moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorResult = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(2),
      bio: null,
      avatar_uri: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(moderatorResult);
  // 3. Owner creates a community
  const community =
    await generate_random_reddit_clone_member_communities_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon: null,
        },
      },
    );
  typia.assert(community);
  // 4. Owner adds the member as moderator (first attempt - should succeed)
  const firstModerator =
    await generate_random_reddit_clone_member_communities_moderators_create(
      ownerConnection,
      {
        params: { communityId: community.id },
        body: {
          memberId: moderatorResult.id,
          role: "mod",
        },
      },
    );
  typia.assert(firstModerator);
  // Verify first moderator assignment
  TestValidator.equals(
    "first moderator member matches",
    firstModerator.member.id,
    moderatorResult.id,
  );
  TestValidator.equals(
    "first moderator community matches",
    firstModerator.community.id,
    community.id,
  );
  TestValidator.equals(
    "first moderator role is mod",
    firstModerator.role,
    "mod",
  );
  // 5. Owner attempts to add the same member again (second attempt - should fail with 409)
  await TestValidator.httpError(
    "duplicate moderator assignment rejected with 409",
    409,
    async () => {
      await generate_random_reddit_clone_member_communities_moderators_create(
        ownerConnection,
        {
          params: { communityId: community.id },
          body: {
            memberId: moderatorResult.id,
            role: "mod",
          },
        },
      );
    },
  );
}
