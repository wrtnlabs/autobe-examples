import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";

export async function test_api_contributor_profile_with_suspended_status(
  connection: api.IConnection,
) {
  // Generate a UUID for the contributor to retrieve
  const contributorId = typia.random<string & tags.Format<"uuid">>();

  // Retrieve the contributor profile
  const contributor: IDiscussionBoardContributor =
    await api.functional.discussionBoard.contributors.at(connection, {
      contributorId: contributorId,
    });

  // Validate the response contains valid contributor data with all required fields
  typia.assert(contributor);

  // Verify the account status is suspended
  TestValidator.equals(
    "account status should be suspended",
    contributor.account_status,
    "suspended",
  );

  // Verify that even with suspended status, all account data is properly returned
  TestValidator.predicate(
    "suspended account should have valid email",
    contributor.email.length > 0,
  );

  TestValidator.predicate(
    "suspended account should have valid username",
    contributor.username.length > 0,
  );

  TestValidator.predicate(
    "suspended account should have creation timestamp",
    contributor.created_at.length > 0,
  );

  TestValidator.predicate(
    "suspended account should have update timestamp",
    contributor.updated_at.length > 0,
  );
}
