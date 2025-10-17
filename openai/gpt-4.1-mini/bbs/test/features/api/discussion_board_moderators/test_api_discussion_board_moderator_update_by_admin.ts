import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test the end-to-end workflow updating a discussion board moderator's
 * information by an administrator user.
 *
 * The test flow:
 *
 * 1. Register and authenticate an administrator user.
 * 2. Update an existing moderator's email, password, and display name using valid
 *    data.
 * 3. Confirm that the updated moderator's response reflects the applied changes.
 * 4. Validate all returned fields to meet format and type constraints.
 * 5. Ensure that permissions are correctly handled by performing updates only as
 *    authenticated admin.
 */
export async function test_api_discussion_board_moderator_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin joins to authenticate and get a token
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPayload = {
    email: adminEmail,
    password: "SecureP@ssword123",
    displayName: RandomGenerator.name(),
  } satisfies IDiscussionBoardAdmin.IJoin;

  const admin = await api.functional.auth.admin.join(connection, {
    body: adminPayload,
  });
  typia.assert(admin);

  // 2. Update a moderator with valid new data
  const moderatorId = typia.random<string & tags.Format<"uuid">>();
  const updatePayload = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "NewStrongP@ssw0rd",
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardModerator.IUpdate;

  const updatedModerator =
    await api.functional.discussionBoard.admin.discussionBoardModerators.update(
      connection,
      {
        discussionBoardModeratorId: moderatorId,
        body: updatePayload,
      },
    );
  typia.assert(updatedModerator);

  // 3. Validate that the updated fields match input
  TestValidator.equals(
    "Updated moderator email matches payload",
    updatedModerator.email,
    updatePayload.email,
  );
  TestValidator.equals(
    "Updated moderator display name matches payload",
    updatedModerator.display_name,
    updatePayload.display_name,
  );

  // 4. Confirm immutable fields are properly formatted
  TestValidator.predicate(
    "Moderator id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      updatedModerator.id,
    ),
  );
  TestValidator.predicate(
    "Moderator created_at is ISO date-time string",
    !!updatedModerator.created_at &&
      !isNaN(Date.parse(updatedModerator.created_at)),
  );
  TestValidator.predicate(
    "Moderator updated_at is ISO date-time string",
    !!updatedModerator.updated_at &&
      !isNaN(Date.parse(updatedModerator.updated_at)),
  );

  // 5. deleted_at can be nullable or undefined, if present, must be ISO string or null
  if (
    updatedModerator.deleted_at !== undefined &&
    updatedModerator.deleted_at !== null
  ) {
    TestValidator.predicate(
      "Moderator deleted_at is ISO date-time string",
      !isNaN(Date.parse(updatedModerator.deleted_at)),
    );
  }
}
