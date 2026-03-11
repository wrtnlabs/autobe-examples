import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_member_profile_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random UUID for the member ID
  const memberId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Call the API to retrieve member profile
  const profile = await api.functional.discussionBoard.members.at(connection, {
    memberId,
  });
  // Validate the response type structure
  typia.assert(profile);
  // Verify the member ID matches the requested ID
  TestValidator.equals("member ID matches input", profile.id, memberId);
  // Verify article_count is a non-negative integer
  TestValidator.predicate(
    "article_count is non-negative",
    profile.article_count >= 0,
  );
  // Verify comment_count is a non-negative integer
  TestValidator.predicate(
    "comment_count is non-negative",
    profile.comment_count >= 0,
  );
  // Note: Sensitive fields (email, password_hash, ban_reason) are excluded from
  // IDiscussionBoardMember type definition, ensuring they cannot be accessed at
  // compile time. This provides type-safe protection against sensitive data exposure.
}
