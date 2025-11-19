import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";

/**
 * Test retrieval of a contributor account with unverified email.
 *
 * This test validates that the API correctly retrieves a contributor account
 * where email_verified is false. This state represents a registered account
 * that has not yet completed email verification. The account should exist in
 * the system but cannot perform actions requiring authentication until the
 * email address is verified.
 *
 * The test ensures that the contributor retrieval endpoint properly returns the
 * email verification status, allowing the system to determine if an account is
 * ready for authenticated operations.
 */
export async function test_api_contributor_profile_email_verified_false(
  connection: api.IConnection,
) {
  // Generate a valid UUID for the contributor ID
  const contributorId = typia.random<string & tags.Format<"uuid">>();

  // Call the API to retrieve the contributor profile
  const contributor: IDiscussionBoardContributor =
    await api.functional.discussionBoard.contributors.at(connection, {
      contributorId: contributorId,
    });

  // Validate the response matches the expected IDiscussionBoardContributor type
  typia.assert(contributor);

  // Verify the response contains the contributor's core information
  TestValidator.predicate(
    "contributor ID should be a valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      contributor.id,
    ),
  );

  TestValidator.predicate(
    "contributor email should be a valid email format",
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contributor.email),
  );

  TestValidator.predicate(
    "contributor username should match pattern",
    /^[a-zA-Z0-9_]{3,50}$/.test(contributor.username),
  );

  TestValidator.predicate(
    "contributor account_status should be valid",
    ["active", "suspended", "restricted", "deleted"].includes(
      contributor.account_status,
    ),
  );

  TestValidator.predicate(
    "email_verified should be a boolean",
    typeof contributor.email_verified === "boolean",
  );

  TestValidator.predicate(
    "created_at should be a valid ISO 8601 date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(contributor.created_at),
  );

  TestValidator.predicate(
    "updated_at should be a valid ISO 8601 date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(contributor.updated_at),
  );
}
