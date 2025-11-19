import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Test partial update support with empty request body.
 *
 * Validates that the profile update endpoint supports partial updates by
 * accepting an empty or minimal request body without errors. When a contributor
 * sends an update request with no fields specified (all fields are optional),
 * the operation should:
 *
 * 1. Not throw any error
 * 2. Return the current profile unchanged
 * 3. Not modify any existing profile data
 *
 * This test ensures that the API properly handles the case where users choose
 * not to update any fields, maintaining data consistency and supporting
 * flexible update patterns.
 *
 * Test flow:
 *
 * 1. Register a new contributor account with valid credentials
 * 2. Send profile update request with empty request body
 * 3. Verify response returns unchanged profile data
 * 4. Confirm no errors occurred and operation completed successfully
 */
export async function test_api_contributor_profile_update_empty_request_body(
  connection: api.IConnection,
) {
  // 1. Register a new contributor account
  const joinResponse: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<50> &
            tags.Pattern<"^[a-zA-Z0-9_]+$">
        >(),
        password: "SecurePass123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(joinResponse);

  // Store original profile data for comparison
  const originalEmail = joinResponse.email;
  const originalUsername = joinResponse.username;

  // 2. Send profile update request with empty request body
  const updateResponse: IDiscussionBoardUser =
    await api.functional.discussionBoard.contributor.profile.update(
      connection,
      {
        body: {} satisfies IDiscussionBoardUser.IUpdate,
      },
    );
  typia.assert(updateResponse);

  // 3. Verify response returns unchanged profile data
  TestValidator.equals(
    "profile email should remain unchanged after empty update",
    updateResponse.email,
    originalEmail,
  );
  TestValidator.equals(
    "profile username should remain unchanged after empty update",
    updateResponse.username,
    originalUsername,
  );

  // 4. Confirm operation completed successfully
  TestValidator.predicate(
    "profile should have valid ID after empty update",
    updateResponse.id !== null && updateResponse.id !== undefined,
  );
  TestValidator.equals(
    "account status should remain active after empty update",
    updateResponse.accountStatus,
    "active",
  );
}
