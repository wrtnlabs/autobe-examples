import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";

export async function test_api_contributor_profile_retrieval_success(
  connection: api.IConnection,
) {
  // Step 1: Generate a random valid contributor ID (UUID format)
  const contributorId = typia.random<string & tags.Format<"uuid">>();

  // Step 2: Call the API to retrieve the contributor's profile using the valid UUID
  const contributor: IDiscussionBoardContributor =
    await api.functional.discussionBoard.contributors.at(connection, {
      contributorId: contributorId,
    });

  // Step 3: Validate the response using typia.assert to ensure all fields are correctly typed
  typia.assert(contributor);

  // Step 4: Verify the returned contributor ID matches the requested ID
  TestValidator.equals(
    "contributor ID matches request parameter",
    contributor.id,
    contributorId,
  );

  // Step 5: Verify account status is one of the valid enum values
  TestValidator.predicate(
    "account status is valid",
    ["active", "suspended", "restricted", "deleted"].includes(
      contributor.account_status,
    ),
  );

  // Step 6: Verify timestamp logical consistency (created_at should not be after updated_at)
  TestValidator.predicate(
    "created_at timestamp is not after updated_at timestamp",
    new Date(contributor.created_at) <= new Date(contributor.updated_at),
  );

  // Step 7: Verify optional timestamp fields maintain logical consistency when present
  if (contributor.deleted_at !== null && contributor.deleted_at !== undefined) {
    TestValidator.predicate(
      "deleted_at timestamp is after or equal to created_at when present",
      new Date(contributor.created_at) <= new Date(contributor.deleted_at),
    );
  }

  if (
    contributor.last_login_at !== null &&
    contributor.last_login_at !== undefined
  ) {
    TestValidator.predicate(
      "last_login_at timestamp is after or equal to created_at when present",
      new Date(contributor.created_at) <= new Date(contributor.last_login_at),
    );
  }
}
