import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityModerator";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
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
import { generate_random_reddit_clone_moderator_communities_moderators_create } from "../../../generate/generate_random_reddit_clone_moderator_communities_moderators_create";
import { prepare_random_reddit_clone_community_moderator } from "../../../prepare/prepare_random_reddit_clone_community_moderator";

/**
 * Test community owner adding a new moderator to their community.
 *
 * Validates the moderator assignment workflow where a community owner grants moderator privileges to another user. The test ensures that the owner can successfully add a moderator, and the returned assignment record contains all required fields including the assigned user's profile, community details, and role information.
 *
 * Special attention is given to verifying that the moderator assignment is properly scoped to the specific community and that the role is correctly set to 'moderator'. The test also validates the complete response structure including nested user profile and community summary objects.
 *
 * 1. Register and authenticate a moderator account (acts as community owner).
 * 2. Register and authenticate another moderator account (will be added as moderator).
 * 3. Create moderator assignment with the second moderator's userProfileId and role='moderator'.
 * 4. Validate response contains correct assignment record with all required fields.
 * 5. Verify the assigned user profile matches the added moderator's profile.
 * 6. Verify the role is correctly set to 'moderator'.
 */
export async function test_api_moderator_assignment_owner_adds_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Register and authenticate moderator (community owner)
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_moderator_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(owner);
  // 2. Setup: Register and authenticate another moderator (to be added as moderator)
  const newModeratorConnection: api.IConnection = { host: connection.host };
  const newModerator = await authorize_moderator_join(newModeratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(newModerator);
  // 3. Create moderator assignment
  // Note: Using a generated UUID for communityId since community creation API is not available
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const assignment =
    await generate_random_reddit_clone_moderator_communities_moderators_create(
      ownerConnection,
      {
        params: {
          communityId,
        },
        body: {
          userProfileId: newModerator.userProfile.id,
          role: "moderator",
        },
      },
    );
  typia.assert(assignment);
  // 4. Validate response structure
  TestValidator.predicate(
    "assignment has valid UUID",
    /^[0-9a-f-]{36}$/i.test(assignment.id),
  );
  TestValidator.equals("role is moderator", assignment.role, "moderator");
  TestValidator.equals(
    "userProfile matches new moderator",
    assignment.userProfile.id,
    newModerator.userProfile.id,
  );
  TestValidator.equals(
    "community matches target",
    assignment.community.id,
    communityId,
  );
  TestValidator.predicate(
    "created_at is valid datetime",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      assignment.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at is valid datetime",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      assignment.updated_at,
    ),
  );
  TestValidator.equals("deleted_at is null", assignment.deleted_at, null);
}
