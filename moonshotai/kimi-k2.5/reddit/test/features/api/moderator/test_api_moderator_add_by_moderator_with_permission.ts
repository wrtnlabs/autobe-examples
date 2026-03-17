import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
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
import { generate_random_reddit_like_moderator_moderators_create } from "../../../generate/generate_random_reddit_like_moderator_moderators_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_moderator } from "../../../prepare/prepare_random_reddit_like_moderator";

/**
 * Test successful moderator addition by a moderator with can_add_moderators permission.
 *
 * This test verifies the permission chain workflow where:
 * 1. A member creates a community and becomes the owner
 * 2. The owner adds Member1 as a moderator with can_add_moderators=true
 * 3. Member1 (now a moderator with permission) adds Member2 as a moderator
 * 4. The resulting moderator role has can_add_moderators=false by default
 *
 * Validates that moderators with the can_add_moderators privilege can successfully
 * recruit other members as moderators, establishing a proper permission delegation chain.
 */
export async function test_api_moderator_add_by_moderator_with_permission(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create owner actor (member who creates community)
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_moderator_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // Step 2: Owner creates a community
  const community = await generate_random_reddit_like_member_communities_create(
    ownerConnection,
    {
      body: {
        name: `${RandomGenerator.alphabets(8)}_${Date.now()}`,
        description: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  // Step 3: Create first member to be promoted to moderator
  const firstModeratorConnection: api.IConnection = { host: connection.host };
  const firstMember = await authorize_moderator_join(firstModeratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // Step 4: Owner adds first member as moderator with can_add_moderators=true
  const firstModerator =
    await api.functional.redditLike.moderator.moderators.create(
      ownerConnection,
      {
        body: {
          communityId: community.id,
          memberId: firstMember.id,
          canAddModerators: true,
        } satisfies IRedditLikeModerator.ICreate,
      },
    );
  typia.assert(firstModerator);
  // Step 5: Create second member to be added as moderator by first moderator
  const secondMemberConnection: api.IConnection = { host: connection.host };
  const secondMember = await authorize_moderator_join(secondMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // Step 6: First moderator adds second member as a new moderator
  const secondModerator =
    await api.functional.redditLike.moderator.moderators.create(
      firstModeratorConnection,
      {
        body: {
          communityId: community.id,
          memberId: secondMember.id,
        } satisfies IRedditLikeModerator.ICreate,
      },
    );
  typia.assert(secondModerator);
  // Step 7: Validate the permission delegation worked correctly
  TestValidator.equals(
    "can_add_moderators should be false by default",
    secondModerator.can_add_moderators,
    false,
  );
  TestValidator.equals(
    "member ID matches",
    secondModerator.member.id,
    secondMember.id,
  );
  TestValidator.equals(
    "community ID matches",
    secondModerator.community.id,
    community.id,
  );
  TestValidator.equals(
    "community name matches",
    secondModerator.community.name,
    community.name,
  );
  // Verify first moderator has can_add_moderators=true
  TestValidator.equals(
    "first moderator should have can_add_moderators=true",
    firstModerator.can_add_moderators,
    true,
  );
}
