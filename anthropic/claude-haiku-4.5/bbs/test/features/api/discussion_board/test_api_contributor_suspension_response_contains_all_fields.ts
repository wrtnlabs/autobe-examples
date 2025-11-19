import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardUserSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSuspension";

/**
 * Validates that the contributor suspension response contains all required
 * fields with proper structure and formatting.
 *
 * This test verifies that when a moderator suspends a contributor account for
 * policy violations, the API response includes the complete suspension record
 * with all necessary fields: id, contributor (with nested id and username),
 * moderator (with nested id and username), suspension_type, reason,
 * severity_level, duration_days, suspended_at, expiration_at, status,
 * lifted_at, lift_reason, created_at, and updated_at.
 *
 * Steps:
 *
 * 1. Create a moderator account via authentication endpoint
 * 2. Prepare suspension details with specific type, reason, and severity level
 * 3. Call the suspension endpoint with a contributor ID
 * 4. Validate that the response contains all required fields
 * 5. Verify field types, formats (UUID for IDs, ISO 8601 for timestamps), and
 *    logical consistency
 * 6. Confirm status is correctly set to 'active' upon creation
 * 7. Ensure nested objects (contributor and moderator) have proper structure with
 *    id and username
 */
export async function test_api_contributor_suspension_response_contains_all_fields(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator
  const moderatorAuth = await api.functional.auth.moderator.join(connection, {
    body: {
      email: typia
        .random<string & tags.Format<"email">>()
        .replace(/^[^@]+/, RandomGenerator.alphabets(8)),
      password: RandomGenerator.alphabets(8) + "Aa1!",
      username: RandomGenerator.alphabets(10),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderatorAuth);

  // Step 2: Prepare suspension request with all required fields
  const contributorId = typia.random<string & tags.Format<"uuid">>();
  const suspensionReason = RandomGenerator.paragraph({ sentences: 5 });
  const suspensionRequest = {
    suspension_type: "account_suspension" as const,
    reason: suspensionReason,
    severity_level: "severe" as const,
    duration_days: 30,
  } satisfies IDiscussionBoardUserSuspension.ICreate;

  // Step 3: Call the suspension endpoint
  const suspensionResponse =
    await api.functional.discussionBoard.moderator.contributors.suspend.create(
      connection,
      {
        contributorId: contributorId,
        body: suspensionRequest,
      },
    );
  typia.assert(suspensionResponse);

  // Step 4: Validate all required top-level fields exist and have correct types
  TestValidator.predicate(
    "suspension response has valid id field",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      suspensionResponse.id,
    ),
  );

  // Step 5: Validate nested contributor object structure
  TestValidator.predicate(
    "contributor has valid id field",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      suspensionResponse.contributor.id,
    ),
  );
  TestValidator.predicate(
    "contributor has username field",
    typeof suspensionResponse.contributor.username === "string" &&
      suspensionResponse.contributor.username.length > 0,
  );

  // Step 6: Validate nested moderator object structure
  TestValidator.predicate(
    "moderator has valid id field",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      suspensionResponse.moderator.id,
    ),
  );
  TestValidator.predicate(
    "moderator has username field",
    typeof suspensionResponse.moderator.username === "string" &&
      suspensionResponse.moderator.username.length > 0,
  );

  // Step 7: Validate suspension type
  TestValidator.equals(
    "suspension_type matches request",
    suspensionResponse.suspension_type,
    suspensionRequest.suspension_type,
  );

  // Step 8: Validate reason
  TestValidator.equals(
    "reason matches request",
    suspensionResponse.reason,
    suspensionRequest.reason,
  );

  // Step 9: Validate severity level
  TestValidator.equals(
    "severity_level matches request",
    suspensionResponse.severity_level,
    suspensionRequest.severity_level,
  );

  // Step 10: Validate duration_days
  TestValidator.equals(
    "duration_days matches request",
    suspensionResponse.duration_days,
    suspensionRequest.duration_days,
  );

  // Step 11: Validate status is active upon creation
  TestValidator.equals("status is active", suspensionResponse.status, "active");

  // Step 12: Validate suspended_at timestamp exists and is valid ISO 8601 format
  TestValidator.predicate(
    "suspended_at is valid ISO 8601 timestamp",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
      suspensionResponse.suspended_at,
    ),
  );

  // Step 13: Validate created_at timestamp exists and is valid ISO 8601 format
  TestValidator.predicate(
    "created_at is valid ISO 8601 timestamp",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(suspensionResponse.created_at),
  );

  // Step 14: Validate updated_at timestamp exists and is valid ISO 8601 format
  TestValidator.predicate(
    "updated_at is valid ISO 8601 timestamp",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(suspensionResponse.updated_at),
  );

  // Step 15: Validate expiration_at field (may be null or contain ISO 8601 timestamp)
  TestValidator.predicate(
    "expiration_at is null or valid ISO 8601 timestamp",
    suspensionResponse.expiration_at === null ||
      suspensionResponse.expiration_at === undefined ||
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
        suspensionResponse.expiration_at,
      ),
  );

  // Step 16: Validate lifted_at field (should be null since suspension just created)
  TestValidator.predicate(
    "lifted_at is null or undefined for new suspension",
    suspensionResponse.lifted_at === null ||
      suspensionResponse.lifted_at === undefined,
  );

  // Step 17: Validate lift_reason field (should be null since suspension not lifted)
  TestValidator.predicate(
    "lift_reason is null or undefined for new suspension",
    suspensionResponse.lift_reason === null ||
      suspensionResponse.lift_reason === undefined,
  );

  // Step 18: Validate timestamp logical ordering
  TestValidator.predicate(
    "suspended_at timestamp is consistent with created_at",
    new Date(suspensionResponse.suspended_at).getTime() <=
      new Date(suspensionResponse.created_at).getTime() + 5000,
  );
}
