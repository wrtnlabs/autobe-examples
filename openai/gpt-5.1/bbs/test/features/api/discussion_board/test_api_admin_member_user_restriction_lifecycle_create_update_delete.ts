import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserJoin";
import type { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";
import type { IDiscussionBoardMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuser";
import type { IDiscussionBoardMemberuserRestriction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuserRestriction";

/**
 * Validate the lifecycle of a discussion-board member user restriction managed
 * by an admin: create, update, and delete.
 *
 * Business context:
 *
 * - Admin users (adminUser actor) can apply moderation restrictions to member
 *   users via the discussion_board_memberuser_restrictions table. Each member
 *   user can have at most one restriction row at a time.
 * - Restrictions capture level (e.g. posting-only vs full block), a high-level
 *   reason category, and a time window (started_at ~ ended_at).
 *
 * This test covers the happy path lifecycle from an admin perspective:
 *
 * 1. Register an admin user via POST /auth/adminUser/join and obtain an
 *    authenticated admin session. The SDK will automatically attach the issued
 *    access token to the provided connection.
 * 2. Create an initial restriction for a member user via POST
 *    /discussionBoard/adminUser/memberUsers/{memberUserId}/restriction with a
 *    specific restriction_level, reason_category, started_at, and an open-ended
 *    window (ended_at = null).
 * 3. Update that restriction via PUT on the same path, changing the
 *    restriction_level, reason_category, and the time window including setting
 *    an explicit ended_at.
 * 4. Validate that the update response returns the same restriction id but
 *    reflects the new business fields, while preserving basic invariants such
 *    as stable created_at and updated timestamps.
 * 5. Finally, delete the restriction via DELETE on the same path and assert that
 *    the call succeeds (no error thrown), effectively lifting the restriction
 *    for that member user.
 *
 * Note:
 *
 * - The original scenario referenced reading back the restriction state via a GET
 *   endpoint to ensure no active restriction exists after deletion. As such a
 *   GET endpoint is not present in the provided SDK, this test instead
 *   concludes lifecycle verification by ensuring that erase() completes
 *   successfully without error.
 */
export async function test_api_admin_member_user_restriction_lifecycle_create_update_delete(
  connection: api.IConnection,
) {
  // 1. Admin joins and becomes authenticated
  const adminJoinBody = typia.random<IDiscussionBoardAdminUserJoin.IRequest>();

  const admin: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  // Type-level validation of the authorized admin payload, including token
  typia.assert<
    IDiscussionBoardAdminuser.IAuthorized & { token: IAuthorizationToken }
  >(admin);

  // 2. Create an initial restriction for a member user
  const memberUserId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const initialStartedAt: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;

  const restrictionLevels = ["posting_restriction", "full_block"] as const;
  const reasonCategories = [
    "repeated_violations",
    "hate_abuse",
    "spam_advertising",
  ] as const;

  const createBody = {
    restriction_level: RandomGenerator.pick(restrictionLevels),
    reason_category: RandomGenerator.pick(reasonCategories),
    started_at: initialStartedAt,
    ended_at: null,
  } satisfies IDiscussionBoardMemberuserRestriction.ICreate;

  const created: IDiscussionBoardMemberuserRestriction =
    await api.functional.discussionBoard.adminUser.memberUsers.restriction.create(
      connection,
      {
        memberUserId,
        body: createBody,
      },
    );
  typia.assert<IDiscussionBoardMemberuserRestriction>(created);

  // Basic business validations for the created restriction
  TestValidator.equals(
    "created restriction_level should match create body",
    created.restriction_level,
    createBody.restriction_level,
  );
  TestValidator.equals(
    "created reason_category should match create body",
    created.reason_category,
    createBody.reason_category,
  );
  TestValidator.equals(
    "created started_at should match create body",
    created.started_at,
    createBody.started_at,
  );
  // ended_at is optional and nullable, but we explicitly set null
  TestValidator.equals(
    "created ended_at should match create body",
    created.ended_at ?? null,
    createBody.ended_at ?? null,
  );

  // 3. Update the restriction: change level, reason, and time window
  const alternativeRestrictionLevels = restrictionLevels.filter(
    (level) => level !== createBody.restriction_level,
  );
  const newRestrictionLevel =
    alternativeRestrictionLevels.length > 0
      ? RandomGenerator.pick(alternativeRestrictionLevels)
      : createBody.restriction_level;

  const updatedStartedAt: string & tags.Format<"date-time"> = new Date(
    Date.now() - 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;
  const updatedEndedAt: string & tags.Format<"date-time"> = new Date(
    Date.now() + 24 * 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;

  const updateBody = {
    restriction_level: newRestrictionLevel,
    reason_category: RandomGenerator.pick(reasonCategories),
    started_at: updatedStartedAt,
    ended_at: updatedEndedAt,
  } satisfies IDiscussionBoardMemberuserRestriction.IUpdate;

  const updated: IDiscussionBoardMemberuserRestriction =
    await api.functional.discussionBoard.adminUser.memberUsers.restriction.update(
      connection,
      {
        memberUserId,
        body: updateBody,
      },
    );
  typia.assert<IDiscussionBoardMemberuserRestriction>(updated);

  // 4. Validate that update reflects new values and preserves invariants
  TestValidator.equals(
    "restriction id remains stable across create and update",
    updated.id,
    created.id,
  );
  TestValidator.equals(
    "updated restriction_level should match update body",
    updated.restriction_level,
    updateBody.restriction_level,
  );
  TestValidator.equals(
    "updated reason_category should match update body",
    updated.reason_category,
    updateBody.reason_category,
  );
  TestValidator.equals(
    "updated started_at should match update body",
    updated.started_at,
    updateBody.started_at,
  );
  TestValidator.equals(
    "updated ended_at should match update body",
    updated.ended_at ?? null,
    updateBody.ended_at ?? null,
  );
  // created_at should remain unchanged, updated_at should be refreshed
  TestValidator.equals(
    "created_at should remain unchanged after update",
    updated.created_at,
    created.created_at,
  );

  // 5. Delete the restriction (lift moderation for this member user)
  await api.functional.discussionBoard.adminUser.memberUsers.restriction.erase(
    connection,
    {
      memberUserId,
    },
  );

  // If erase throws, the test will fail naturally. No further GET endpoint is
  // available to verify absence, so the lifecycle assertion ends here.
}
