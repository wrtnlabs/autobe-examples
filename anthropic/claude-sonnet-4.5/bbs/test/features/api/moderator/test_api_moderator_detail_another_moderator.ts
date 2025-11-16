import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test moderator retrieving another moderator's profile information.
 *
 * This test validates that a moderator can successfully retrieve detailed
 * profile information of another moderator in the discussion board system.
 *
 * The workflow includes:
 *
 * 1. Create the first moderator account (moderator A)
 * 2. Create the second moderator account (moderator B)
 * 3. Authenticate as moderator A
 * 4. Retrieve moderator B's profile using their ID
 * 5. Validate the retrieved profile matches moderator B's information
 */
export async function test_api_moderator_detail_another_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create the first moderator account (moderator A)
  const moderatorAEmail = typia.random<string & tags.Format<"email">>();
  const moderatorAUsername = RandomGenerator.name(1);
  const moderatorA: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorAEmail,
        password: "securePassword123",
        username: moderatorAUsername,
        ip: "192.168.1.100",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderatorA);

  // Step 2: Create the second moderator account (moderator B)
  const moderatorBEmail = typia.random<string & tags.Format<"email">>();
  const moderatorBUsername = RandomGenerator.name(1);
  const moderatorB: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorBEmail,
        password: "anotherPassword456",
        username: moderatorBUsername,
        ip: "192.168.1.101",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderatorB);

  // Step 3: Authenticate as moderator A (already authenticated from join)
  // The join operation automatically sets the authorization token in connection.headers
  // So moderator A is now the authenticated user

  // Step 4: Retrieve moderator B's profile details
  const retrievedModeratorB: IDiscussionBoardModerator.ISummary =
    await api.functional.discussionBoard.moderator.moderators.at(connection, {
      moderatorId: moderatorB.id,
    });
  typia.assert(retrievedModeratorB);

  // Step 5: Validate the retrieved profile matches moderator B's information
  TestValidator.equals(
    "retrieved moderator ID matches moderator B",
    retrievedModeratorB.id,
    moderatorB.id,
  );

  TestValidator.equals(
    "retrieved moderator email matches moderator B",
    retrievedModeratorB.email,
    moderatorB.email,
  );

  TestValidator.equals(
    "retrieved moderator username matches moderator B",
    retrievedModeratorB.username,
    moderatorB.username,
  );

  TestValidator.equals(
    "retrieved moderator created_at matches moderator B",
    retrievedModeratorB.created_at,
    moderatorB.created_at,
  );

  TestValidator.equals(
    "retrieved moderator updated_at matches moderator B",
    retrievedModeratorB.updated_at,
    moderatorB.updated_at,
  );
}
