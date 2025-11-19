import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Test successful email update by authenticated contributor.
 *
 * This test validates the profile update functionality for contributors. The
 * process includes:
 *
 * 1. Register a new contributor account with an initial email address
 * 2. Update the contributor's email to a new valid address
 * 3. Verify the response includes the updated profile information with new email
 * 4. Verify the updated_at timestamp is recorded and reflects the update
 * 5. Confirm email uniqueness constraints are maintained
 */
export async function test_api_contributor_profile_update_email_success(
  connection: api.IConnection,
) {
  // Step 1: Register a new contributor account
  const initialEmail = typia.random<string & tags.Format<"email">>();
  const newEmail = typia.random<string & tags.Format<"email">>();

  const registeredContributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: initialEmail,
        username: RandomGenerator.alphabets(20),
        password: "SecurePass123!",
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(registeredContributor);

  TestValidator.equals(
    "initial email matches registered email",
    registeredContributor.email,
    initialEmail,
  );

  const initialUpdatedAt = registeredContributor.updated_at;

  // Step 2: Update the contributor's email to a new valid address
  const updateBody = {
    email: newEmail,
  } satisfies IDiscussionBoardUser.IUpdate;

  const updatedProfile: IDiscussionBoardUser =
    await api.functional.discussionBoard.contributor.profile.update(
      connection,
      {
        body: updateBody,
      },
    );
  typia.assert(updatedProfile);

  // Step 3: Verify the response includes updated profile information with new email
  TestValidator.equals(
    "updated email matches new email",
    updatedProfile.email,
    newEmail,
  );

  TestValidator.equals(
    "username remains unchanged",
    updatedProfile.username,
    registeredContributor.username,
  );

  TestValidator.equals(
    "contributor id remains unchanged",
    updatedProfile.id,
    registeredContributor.id,
  );

  // Step 4: Verify the updated_at timestamp is recorded and reflects the update
  TestValidator.predicate(
    "updated_at timestamp is recorded",
    updatedProfile.updatedAt !== null && updatedProfile.updatedAt !== undefined,
  );

  TestValidator.notEquals(
    "updated_at timestamp changed after email update",
    updatedProfile.updatedAt,
    initialUpdatedAt,
  );

  // Step 5: Verify email is unique - attempting to register another contributor
  // with the updated email should fail
  await TestValidator.error(
    "duplicate email should fail on registration",
    async () => {
      await api.functional.auth.contributor.join(connection, {
        body: {
          email: newEmail,
          username: RandomGenerator.alphabets(20),
          password: "SecurePass123!",
          href: "https://example.com/register",
          referrer: "https://example.com",
        } satisfies IDiscussionBoardContributor.ICreate,
      });
    },
  );
}
