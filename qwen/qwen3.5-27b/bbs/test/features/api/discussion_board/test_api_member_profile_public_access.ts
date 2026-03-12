import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test that a guest user can successfully retrieve a member's public profile information.
 * Validates that public fields are accessible while sensitive fields are not exposed.
 */
export async function test_api_member_profile_public_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Generate a valid member ID
  const memberId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 2. Retrieve member profile (no authentication required for public access)
  const profile = await api.functional.discussionBoard.members.at(connection, {
    memberId,
  });
  typia.assert(profile);
  // 3. Verify sensitive fields are NOT exposed (business logic validation)
  const sensitiveFields = ["email", "password", "password_hash"];
  for (const field of sensitiveFields) {
    TestValidator.predicate(
      `sensitive field '${field}' is not exposed`,
      !(field in profile),
    );
  }
  // 4. Validate business logic: timestamps should be reasonable
  const createdAt = new Date(profile.created_at);
  const updatedAt = new Date(profile.updated_at);
  const now = new Date();
  TestValidator.predicate("created_at is in the past", createdAt <= now);
  TestValidator.predicate(
    "updated_at is >= created_at",
    updatedAt >= createdAt,
  );
  // 5. Verify public fields have expected values
  TestValidator.equals("member ID matches request", profile.id, memberId);
  TestValidator.predicate(
    "banned status is boolean",
    typeof profile.banned === "boolean",
  );
}
