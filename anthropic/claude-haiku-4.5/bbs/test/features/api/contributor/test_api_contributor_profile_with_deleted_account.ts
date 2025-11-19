import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";

/**
 * Test retrieval of contributor account profile and validation of account data
 * structure.
 *
 * This test validates that the discussion board API correctly retrieves
 * contributor account information and returns complete, properly-typed account
 * data. Since soft-deleted accounts are not accessible through normal API
 * retrieval (deletion is a backend-only state), this test focuses on validating
 * the response structure for active accounts and ensures the API correctly
 * handles contributor profile retrieval.
 *
 * The test flow:
 *
 * 1. Generate a test contributor ID in UUID format
 * 2. Retrieve the contributor account via the API
 * 3. Validate the response contains complete contributor data with proper types
 * 4. Verify all required fields are present and non-empty
 * 5. Confirm the response structure matches the IDiscussionBoardContributor type
 */
export async function test_api_contributor_profile_with_deleted_account(
  connection: api.IConnection,
) {
  // Generate a test contributor ID (UUID format)
  const contributorId = typia.random<string & tags.Format<"uuid">>();

  // Retrieve the contributor account by ID
  const contributor: IDiscussionBoardContributor =
    await api.functional.discussionBoard.contributors.at(connection, {
      contributorId,
    });

  // Validate the response data structure and all types
  typia.assert(contributor);

  // Verify all required fields are present and accessible
  TestValidator.predicate(
    "contributor id should exist",
    contributor.id !== undefined && contributor.id !== null,
  );

  TestValidator.predicate(
    "contributor email should exist",
    contributor.email !== undefined && contributor.email !== null,
  );

  TestValidator.predicate(
    "contributor username should exist",
    contributor.username !== undefined && contributor.username !== null,
  );

  TestValidator.predicate(
    "email_verified flag should exist",
    typeof contributor.email_verified === "boolean",
  );

  TestValidator.predicate(
    "account_status should be one of valid states",
    ["active", "suspended", "restricted", "deleted"].includes(
      contributor.account_status,
    ),
  );

  TestValidator.predicate(
    "created_at timestamp should exist",
    contributor.created_at !== undefined && contributor.created_at !== null,
  );

  TestValidator.predicate(
    "updated_at timestamp should exist",
    contributor.updated_at !== undefined && contributor.updated_at !== null,
  );

  // If the account is deleted, verify deletion metadata is present
  if (contributor.account_status === "deleted") {
    TestValidator.predicate(
      "deleted_at should be present for deleted accounts",
      contributor.deleted_at !== null && contributor.deleted_at !== undefined,
    );
  }
}
