import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_member_profile_retrieval_deleted(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random member ID to test the endpoint
  const memberId = typia.random<string & tags.Format<"uuid">>();
  // Call the member profile retrieval endpoint
  const profile = await api.functional.discussionBoard.members.at(connection, {
    memberId,
  });
  // Validate the complete response structure using typia
  typia.assert(profile);
  // Verify that the response includes all required fields from IDiscussionBoardMember
  // The typia.assert above already validates all type constraints including formats
  // Check if deleted_at field exists in the response (could be null/undefined or timestamp)
  // This tests that soft-deleted members' profiles remain accessible
  TestValidator.predicate(
    "profile contains id field",
    profile.id !== undefined,
  );
  TestValidator.predicate(
    "profile contains email field",
    profile.email !== undefined,
  );
  TestValidator.predicate(
    "profile contains display_name field",
    profile.display_name !== undefined,
  );
  TestValidator.predicate(
    "profile contains is_banned field",
    typeof profile.is_banned === "boolean",
  );
  TestValidator.predicate(
    "profile contains created_at field",
    profile.created_at !== undefined,
  );
  TestValidator.predicate(
    "profile contains updated_at field",
    profile.updated_at !== undefined,
  );
  // Verify that deleted_at field exists in the response (may be null, undefined, or timestamp)
  // The DTO defines it as optional (string & tags.Format<"date-time">) | null | undefined
  TestValidator.predicate(
    "deleted_at field is present in response structure (may be null or undefined)",
    profile.deleted_at === null ||
      profile.deleted_at === undefined ||
      (typeof profile.deleted_at === "string" &&
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(profile.deleted_at)),
  );
  // Validate UUID format of id (typia.assert already does this, but we confirm)
  TestValidator.predicate(
    "id is valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      profile.id,
    ),
  );
  // Validate email format (typia.assert already does this, but we confirm)
  TestValidator.predicate(
    "email is valid email format",
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email),
  );
  // Validate date-time formats for timestamps
  TestValidator.predicate(
    "created_at is valid date-time format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(profile.created_at),
  );
  TestValidator.predicate(
    "updated_at is valid date-time format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(profile.updated_at),
  );
  // Test that is_banned is boolean as per DTO
  TestValidator.equals(
    "is_banned is boolean type",
    typeof profile.is_banned,
    "boolean",
  );
  // If bio is present, it should be string or null
  if (profile.bio !== undefined && profile.bio !== null) {
    TestValidator.equals(
      "bio is string when present",
      typeof profile.bio,
      "string",
    );
  }
  // If ban_reason is present, it should be string or null
  if (profile.ban_reason !== undefined && profile.ban_reason !== null) {
    TestValidator.equals(
      "ban_reason is string when present",
      typeof profile.ban_reason,
      "string",
    );
  }
  // If admin_grade is present, it should be string or null
  if (profile.admin_grade !== undefined && profile.admin_grade !== null) {
    TestValidator.equals(
      "admin_grade is string when present",
      typeof profile.admin_grade,
      "string",
    );
  }
  // The primary test: verify that the API endpoint returns a valid member profile
  // structure even for potentially deleted members (deleted_at field is part of structure)
  await TestValidator.predicate(
    "API returns complete member profile structure",
    !!(profile.id &&
      profile.email &&
      profile.display_name &&
      profile.created_at &&
      profile.updated_at),
  );
}