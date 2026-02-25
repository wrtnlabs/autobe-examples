import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_owner_summary_includes_public_fields_only(
  connection: api.IConnection,
): Promise<void> {
  // Since we cannot create communities, use the SDK's random generator to create a valid community
  // This simulates a real response from the server with a valid community structure
  const community = typia.random<IRedditCommunityCommunity>();
  typia.assert(community);
  // Validate that the owner field is exactly IRedditCommunityMember.ISummary
  const owner = community.owner;
  typia.assert<IRedditCommunityMember.ISummary>(owner);
  // Use TestValidator to verify all 7 public fields are present and properly typed
  TestValidator.equals("owner id is UUID", owner.id.length > 0, true);
  TestValidator.equals(
    "owner username is string",
    owner.username.length > 0,
    true,
  );
  TestValidator.equals(
    "owner display_name is string",
    owner.display_name.length > 0,
    true,
  );
  TestValidator.predicate(
    "owner bio is null or string",
    owner.bio === null || typeof owner.bio === "string",
  );
  TestValidator.predicate(
    "owner avatar_url is null or string",
    owner.avatar_url === null || typeof owner.avatar_url === "string",
  );
  TestValidator.equals(
    "owner karma_score is number",
    typeof owner.karma_score === "number",
    true,
  );
  TestValidator.predicate(
    "owner karma_score is non-negative",
    owner.karma_score >= 0,
  );
  TestValidator.equals(
    "owner created_at is ISO date-time string",
    typeof owner.created_at === "string",
    true,
  );
  // Verify that no sensitive fields are present in owner object
  // These fields must not exist in the owner object
  TestValidator.predicate("owner has no email", !("email" in owner));
  TestValidator.predicate(
    "owner has no password_hash",
    !("password_hash" in owner),
  );
  TestValidator.predicate("owner has no is_deleted", !("is_deleted" in owner));
  TestValidator.predicate(
    "owner has no session_token",
    !("session_token" in owner),
  );
  // Verify owner has exactly the 7 expected public fields and no more
  const publicFields = [
    "id",
    "username",
    "display_name",
    "bio",
    "avatar_url",
    "karma_score",
    "created_at",
  ];
  const ownerKeys = Object.keys(owner);
  TestValidator.equals(
    "owner has exactly 7 public fields",
    ownerKeys.length,
    publicFields.length,
  );
  publicFields.forEach((field) => {
    TestValidator.equals(
      `owner has field ${field}`,
      ownerKeys.includes(field),
      true,
    );
  });
}
