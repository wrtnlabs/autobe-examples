import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";

export async function test_api_contributor_profile_public_access(
  connection: api.IConnection,
) {
  // Test accessing contributor profile without authentication
  // Generate a random contributor ID to test public access
  const contributorId = typia.random<string & tags.Format<"uuid">>();

  // Call the endpoint to retrieve contributor profile information
  // This endpoint should be publicly accessible without requiring authentication
  const contributor: IDiscussionBoardContributor =
    await api.functional.discussionBoard.contributors.at(connection, {
      contributorId: contributorId,
    });

  // Validate the response contains valid contributor data
  typia.assert(contributor);

  // Verify that the response has the expected contributor profile structure
  TestValidator.predicate(
    "contributor profile contains valid ID",
    !!contributor.id && contributor.id.length > 0,
  );

  TestValidator.predicate(
    "contributor profile contains valid email",
    !!contributor.email && contributor.email.includes("@"),
  );

  TestValidator.predicate(
    "contributor profile contains valid username",
    !!contributor.username && contributor.username.length >= 3,
  );

  TestValidator.predicate(
    "contributor profile contains email verification status",
    typeof contributor.email_verified === "boolean",
  );

  TestValidator.predicate(
    "contributor profile contains valid account status",
    ["active", "suspended", "restricted", "deleted"].includes(
      contributor.account_status,
    ),
  );

  TestValidator.predicate(
    "contributor profile contains creation timestamp",
    !!contributor.created_at,
  );

  TestValidator.predicate(
    "contributor profile contains update timestamp",
    !!contributor.updated_at,
  );
}
