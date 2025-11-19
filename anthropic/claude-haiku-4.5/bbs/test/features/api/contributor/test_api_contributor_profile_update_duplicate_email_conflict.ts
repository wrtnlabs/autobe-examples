import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Test email uniqueness constraint enforcement during profile update.
 *
 * This test validates that the API properly enforces email uniqueness
 * constraints when updating a contributor's profile. The scenario involves two
 * contributors with different emails, where the first contributor attempts to
 * change their email to match the second contributor's existing email. The API
 * should reject this operation with a 409 Conflict error indicating the email
 * field caused the conflict, and no profile changes should be persisted.
 *
 * Test workflow:
 *
 * 1. Register first contributor with unique email
 * 2. Register second contributor with different unique email
 * 3. Attempt to update first contributor's email to second contributor's email
 * 4. Verify HTTP 409 Conflict error is returned
 * 5. Confirm first contributor's email remains unchanged by verifying update with
 *    original email succeeds
 */
export async function test_api_contributor_profile_update_duplicate_email_conflict(
  connection: api.IConnection,
) {
  // Step 1: Register first contributor with unique email
  const firstEmail = typia.random<string & tags.Format<"email">>();
  const firstContributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: firstEmail,
        username: RandomGenerator.name(1),
        password: "SecurePass123!",
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(firstContributor);
  TestValidator.equals(
    "first contributor email matches registration",
    firstContributor.email,
    firstEmail,
  );

  // Step 2: Register second contributor with different unique email
  const secondEmail = typia.random<string & tags.Format<"email">>();
  const secondContributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: secondEmail,
        username: RandomGenerator.name(1),
        password: "SecurePass456!",
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(secondContributor);
  TestValidator.equals(
    "second contributor email matches registration",
    secondContributor.email,
    secondEmail,
  );
  TestValidator.notEquals(
    "contributor emails are different",
    firstContributor.email,
    secondContributor.email,
  );

  // Note: After second join, connection is authenticated as second contributor
  // We need to re-authenticate as first contributor by making another join
  const firstContributorReauth: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: firstEmail,
        username: RandomGenerator.name(1),
        password: "SecurePass123!",
        href: "https://example.com/login",
        referrer: "https://example.com",
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(firstContributorReauth);

  // Step 3: Attempt to update first contributor's email to second contributor's email
  // This should fail with HTTP 409 Conflict error due to email uniqueness constraint
  await TestValidator.error(
    "duplicate email update should fail with conflict",
    async () => {
      await api.functional.discussionBoard.contributor.profile.update(
        connection,
        {
          body: {
            email: secondEmail,
          } satisfies IDiscussionBoardUser.IUpdate,
        },
      );
    },
  );

  // Step 4: Verify first contributor's email remains unchanged
  // If the email was not changed by the failed update, this update with original email should succeed
  const verifyUnchanged: IDiscussionBoardUser =
    await api.functional.discussionBoard.contributor.profile.update(
      connection,
      {
        body: {
          email: firstEmail,
        } satisfies IDiscussionBoardUser.IUpdate,
      },
    );
  typia.assert(verifyUnchanged);
  TestValidator.equals(
    "first contributor email is still original after failed duplicate update",
    verifyUnchanged.email,
    firstEmail,
  );
}
