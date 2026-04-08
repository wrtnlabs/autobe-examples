import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityModerator";
import type { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { generate_random_reddit_clone_moderator_communities_moderators_create } from "../../../generate/generate_random_reddit_clone_moderator_communities_moderators_create";
import { prepare_random_reddit_clone_community_moderator } from "../../../prepare/prepare_random_reddit_clone_community_moderator";

/**
 * Test moderator assignment where an existing moderator adds another moderator to a community.
 *
 * Validates the hierarchical moderator assignment capability where a moderator (not just the owner) can assign moderator privileges to other users within their community. This test ensures that moderator delegation works correctly and that the newly added moderator receives the appropriate role and privileges.
 *
 * The test creates two moderator accounts, establishes one as an existing moderator of a community, then verifies that this moderator can successfully add the second moderator to the same community.
 *
 * Prerequisites:
 * - A valid community must exist in the test environment (communityId is generated for this test)
 *
 * 1. Authenticate as moderator A (existing moderator who will add another moderator)
 * 2. Authenticate as moderator B (user to be added as moderator)
 * 3. Assign moderator A as a moderator of the community
 * 4. Moderator A adds moderator B as a moderator to the community
 * 5. Validate the moderator assignment record contains correct data
 * 6. Verify both moderators have appropriate roles in the community
 */
export async function test_api_moderator_assignment_moderator_adds_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as moderator A (existing moderator who will add another moderator)
  const moderatorAConnection: api.IConnection = { host: connection.host };
  const moderatorA = await authorize_moderator_join(moderatorAConnection, {
    body: {
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(moderatorA);
  // 2. Authenticate as moderator B (user to be added as moderator)
  const moderatorBConnection: api.IConnection = { host: connection.host };
  const moderatorB = await authorize_moderator_join(moderatorBConnection, {
    body: {
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(moderatorB);
  // 3. Use a community ID (assumes community exists in test environment)
  const communityId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Assign moderator A as a moderator of the community first
  // This establishes moderator A's authority to add other moderators
  const moderatorAAssignment =
    await generate_random_reddit_clone_moderator_communities_moderators_create(
      moderatorAConnection,
      {
        params: {
          communityId,
        },
        body: {
          userProfileId: moderatorA.userProfile.id,
          role: "moderator",
        },
      },
    );
  typia.assert(moderatorAAssignment);
  // Validate moderator A's assignment
  TestValidator.equals(
    "moderator A assignment has correct user profile",
    moderatorAAssignment.userProfile.id,
    moderatorA.userProfile.id,
  );
  TestValidator.equals(
    "moderator A assignment has correct role",
    moderatorAAssignment.role,
    "moderator",
  );
  // 5. Moderator A adds moderator B as a moderator to the community
  // This validates that moderators (not just owners) can add other moderators
  const moderatorBAssignment =
    await generate_random_reddit_clone_moderator_communities_moderators_create(
      moderatorAConnection,
      {
        params: {
          communityId,
        },
        body: {
          userProfileId: moderatorB.userProfile.id,
          role: "moderator",
        },
      },
    );
  typia.assert(moderatorBAssignment);
  // 6. Validate the moderator assignment record
  TestValidator.equals(
    "moderator B assignment has correct user profile",
    moderatorBAssignment.userProfile.id,
    moderatorB.userProfile.id,
  );
  TestValidator.equals(
    "moderator B assignment has correct role",
    moderatorBAssignment.role,
    "moderator",
  );
  TestValidator.equals(
    "moderator B assignment references correct community",
    moderatorBAssignment.community.id,
    communityId,
  );
  TestValidator.predicate(
    "moderator B assignment has valid created_at timestamp",
    moderatorBAssignment.created_at !== null,
  );
  TestValidator.predicate(
    "moderator B assignment is not deleted",
    moderatorBAssignment.deleted_at === null,
  );
  // 7. Verify both moderators are assigned to the same community
  TestValidator.equals(
    "both moderators assigned to same community",
    moderatorAAssignment.community.id,
    moderatorBAssignment.community.id,
  );
}
