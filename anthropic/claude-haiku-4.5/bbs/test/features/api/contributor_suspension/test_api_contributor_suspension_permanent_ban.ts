import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardUserSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSuspension";

/**
 * Test creating a permanent ban for the most severe violations.
 *
 * This test validates that moderators can enforce permanent account bans for
 * severe policy violations. A permanent ban disables the contributor account
 * indefinitely with no expiration date.
 *
 * The test flow:
 *
 * 1. Register a moderator account through authentication
 * 2. Generate a test contributor ID for the suspension target
 * 3. Create a permanent ban suspension with permanent severity and no duration
 * 4. Verify the suspension record contains correct permanent ban attributes
 * 5. Confirm the status is active and expiration is null (indefinite)
 */
export async function test_api_contributor_suspension_permanent_ban(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator to gain suspension enforcement permissions
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "SecurePass123!",
        username: RandomGenerator.name(1),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);
  TestValidator.equals(
    "moderator authenticated",
    moderator.account_status,
    "active",
  );

  // Step 2: Generate a contributor ID for the suspension target
  const contributorId: string = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Create a permanent ban suspension for severe violation
  const suspension: IDiscussionBoardUserSuspension =
    await api.functional.discussionBoard.moderator.contributors.suspend.create(
      connection,
      {
        contributorId: contributorId,
        body: {
          suspension_type: "permanent_ban",
          reason:
            "Permanent account ban due to severe and repeated policy violations including harassment, threats, and hateful content. This account poses an ongoing risk to community safety and is permanently disabled effective immediately.",
          severity_level: "permanent",
          // duration_days omitted - null for permanent suspensions with no expiration
        } satisfies IDiscussionBoardUserSuspension.ICreate,
      },
    );
  typia.assert(suspension);

  // Step 4: Verify permanent ban attributes in the suspension record
  TestValidator.equals(
    "suspension type is permanent_ban",
    suspension.suspension_type,
    "permanent_ban",
  );
  TestValidator.equals(
    "severity level is permanent",
    suspension.severity_level,
    "permanent",
  );
  TestValidator.equals("status is active", suspension.status, "active");

  // Step 5: Verify expiration is null for indefinite ban
  TestValidator.equals(
    "expiration_at is null for permanent ban",
    suspension.expiration_at,
    null,
  );

  // Step 6: Validate the suspension contains required enforcement metadata
  TestValidator.predicate(
    "suspension has contributor reference",
    suspension.contributor !== null && suspension.contributor !== undefined,
  );
  TestValidator.predicate(
    "suspension has moderator reference",
    suspension.moderator !== null && suspension.moderator !== undefined,
  );
  TestValidator.predicate(
    "suspension has suspension id",
    suspension.id !== null && suspension.id !== undefined,
  );
  TestValidator.predicate(
    "suspension has suspended_at timestamp",
    suspension.suspended_at !== null && suspension.suspended_at !== undefined,
  );

  // Step 7: Verify reason is recorded for compliance purposes
  TestValidator.predicate(
    "reason is provided for audit trail",
    suspension.reason.length > 0 && suspension.reason.length <= 1000,
  );

  // Step 8: Confirm that lifted_at is null (ban is permanent and cannot be lifted)
  TestValidator.equals(
    "lifted_at is null for permanent ban",
    suspension.lifted_at,
    null,
  );
}
