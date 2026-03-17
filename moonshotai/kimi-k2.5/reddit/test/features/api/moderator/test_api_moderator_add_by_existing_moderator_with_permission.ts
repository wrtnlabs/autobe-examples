import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikeOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_owner_moderators_create } from "../../../generate/generate_random_reddit_like_owner_moderators_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_moderator } from "../../../prepare/prepare_random_reddit_like_moderator";

/**
 * Tests that an existing moderator with can_add_moderators=true can add additional moderators to the community.
 *
 * Steps:
 * 1. Owner authenticates via authorize_owner_join
 * 2. First member authenticates via authorize_member_join (will become first moderator)
 * 3. Second member authenticates via authorize_member_join (will become second moderator)
 * 4. Owner creates a community via generate_random_reddit_like_member_communities_create
 * 5. Owner adds first member as moderator with can_add_moderators=true flag
 * 6. First moderator adds second member as moderator
 * 7. Verify the system allows the operation because the first moderator has can_add_moderators permission
 */
export async function test_api_moderator_add_by_existing_moderator_with_permission(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Owner authenticates via join
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_owner_join(ownerConnection, {});
  typia.assert(owner);
  // Step 2: First member authenticates via join (will become first moderator)
  const member1Connection: api.IConnection = { host: connection.host };
  const firstMember = await authorize_member_join(member1Connection, {});
  typia.assert(firstMember);
  // Step 3: Second member authenticates via join (will become second moderator)
  const member2Connection: api.IConnection = { host: connection.host };
  const secondMember = await authorize_member_join(member2Connection, {});
  typia.assert(secondMember);
  // Step 4: Owner creates a community
  const community = await generate_random_reddit_like_member_communities_create(
    ownerConnection,
    {
      body: {
        name: typia.random<string & tags.MinLength<1> & tags.MaxLength<50>>(),
        description: typia.random<
          string & tags.MinLength<1> & tags.MaxLength<500>
        >(),
      },
    },
  );
  typia.assert(community);
  // Step 5: Owner adds first member as moderator with can_add_moderators=true flag
  const firstModerator =
    await generate_random_reddit_like_owner_moderators_create(ownerConnection, {
      body: {
        communityId: community.id,
        memberId: firstMember.id,
        canAddModerators: true,
      },
    });
  typia.assert(firstModerator);
  // Verify first moderator has can_add_moderators=true
  TestValidator.predicate(
    "first moderator has can_add_moderators permission",
    firstModerator.can_add_moderators,
  );
  // Step 6: The first moderator adds second member as moderator
  const secondModerator =
    await generate_random_reddit_like_owner_moderators_create(
      member1Connection,
      {
        body: {
          communityId: community.id,
          memberId: secondMember.id,
          canAddModerators: false,
        },
      },
    );
  typia.assert(secondModerator);
  // Step 7 & 8: Verify both moderators exist with correct permission flags
  TestValidator.predicate(
    "second moderator was added successfully by first moderator",
    secondModerator.id !== undefined,
  );
  TestValidator.equals(
    "second moderator references correct community",
    secondModerator.community.id,
    community.id,
  );
  TestValidator.equals(
    "second moderator references correct member",
    secondModerator.member.id,
    secondMember.id,
  );
}
