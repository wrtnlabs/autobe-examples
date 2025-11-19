import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";

export async function test_api_contributor_profile_with_restricted_status(
  connection: api.IConnection,
) {
  // Generate a random contributor ID to retrieve
  const contributorId = typia.random<string & tags.Format<"uuid">>();

  // Retrieve the contributor profile by ID
  const contributor: IDiscussionBoardContributor =
    await api.functional.discussionBoard.contributors.at(connection, {
      contributorId: contributorId,
    });

  // Validate complete response type structure and all constraints
  typia.assert(contributor);

  // Validate the critical business logic: restricted account status
  TestValidator.equals(
    "contributor account status must be restricted",
    contributor.account_status,
    "restricted",
  );

  // Validate that all required fields are present and populated
  TestValidator.predicate(
    "contributor id must exist",
    contributor.id !== null &&
      contributor.id !== undefined &&
      contributor.id.length > 0,
  );

  TestValidator.predicate(
    "contributor email must exist",
    contributor.email !== null &&
      contributor.email !== undefined &&
      contributor.email.length > 0,
  );

  TestValidator.predicate(
    "contributor username must exist",
    contributor.username !== null &&
      contributor.username !== undefined &&
      contributor.username.length > 0,
  );

  // Validate timestamps are properly set
  TestValidator.predicate(
    "created_at timestamp must be set",
    contributor.created_at !== null && contributor.created_at !== undefined,
  );

  TestValidator.predicate(
    "updated_at timestamp must be set",
    contributor.updated_at !== null && contributor.updated_at !== undefined,
  );
}
