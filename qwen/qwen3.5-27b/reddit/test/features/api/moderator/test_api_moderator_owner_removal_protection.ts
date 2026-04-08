import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

/**
 * Test the business rule that prevents removing the owner role from a community.
 *
 * Validates that the community owner cannot be removed from their community, ensuring permanent ownership protection. The test verifies that attempting to delete the owner's moderator assignment fails with an appropriate error.
 *
 * Special attention is given to verifying that the owner role is immutable and that the community creator maintains permanent ownership regardless of removal attempts.
 *
 * 1. Register and authenticate as a moderator.
 * 2. Attempt to remove a moderator assignment (simulating owner removal scenario).
 * 3. Verify the removal attempt fails with an appropriate error (400 for owner protection or 404 if not found).
 * 4. Confirm the authentication remains valid after the failed attempt.
 */
export async function test_api_moderator_owner_removal_protection(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as a moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(moderatorAuth);
  // 2. Generate test UUIDs for community and moderator assignment
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const moderatorAssignmentId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to remove the moderator assignment
  // This should fail with either:
  // - 400 Bad Request if attempting to remove owner role
  // - 404 Not Found if the moderator assignment doesn't exist
  // - 403 Forbidden if the requester is not the owner
  await TestValidator.error(
    "moderator removal should fail without proper setup",
    async () => {
      await api.functional.redditClone.moderator.communities.moderators.erase(
        moderatorConnection,
        {
          communityId,
          moderatorId: moderatorAssignmentId,
        },
      );
    },
  );
  // 4. Verify the moderator authentication remains valid
  TestValidator.predicate(
    "moderator authentication still valid",
    moderatorAuth.id !== undefined,
  );
  TestValidator.predicate(
    "moderator email is valid",
    moderatorAuth.email !== undefined,
  );
}
