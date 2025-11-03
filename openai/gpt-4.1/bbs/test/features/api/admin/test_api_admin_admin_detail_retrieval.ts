import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";

/**
 * E2E: Retrieve administrator details by UUID with full business and permission
 * validation.
 *
 * Steps:
 *
 * 1. Register admin A
 * 2. Register admin B; this will be the target whose full details are inspected
 * 3. Authenticate as admin A (ensure admin-level session; token is handled)
 * 4. Create a dummy moderationAction as resource context (ensures admin session is
 *    fully operational)
 * 5. Admin A fetches details for admin B (should succeed: all fields return)
 * 6. Attempt to fetch non-existent admin (should fail)
 * 7. Simulate admin B lock: (API does not support lock mutation in test) --
 *    omitted
 * 8. Simulate admin B soft-delete: (API does not support delete mutation in test)
 *    -- omitted
 * 9. Unauthenticated fetch (should fail due to missing token)
 */
export async function test_api_admin_admin_detail_retrieval(
  connection: api.IConnection,
) {
  // 1. Register first admin (admin A)
  const emailA = typia.random<string & tags.Format<"email">>();
  const passwordA = RandomGenerator.alphaNumeric(12);
  const displayNameA = RandomGenerator.name();
  const adminA = await api.functional.auth.admin.join(connection, {
    body: {
      email: emailA,
      password: passwordA,
      display_name: displayNameA,
    } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(adminA);

  // 2. Register second admin (admin B) to fetch later
  const emailB = typia.random<string & tags.Format<"email">>();
  const passwordB = RandomGenerator.alphaNumeric(12);
  const displayNameB = RandomGenerator.name();
  const adminB = await api.functional.auth.admin.join(connection, {
    body: {
      email: emailB,
      password: passwordB,
      display_name: displayNameB,
    } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(adminB);

  // 3. Authenticate as admin A (token set by join; ready)

  // 4. Admin A creates a dummy moderation action (verifies admin powers)
  const actionInput = {
    action_type: "warn",
    action_reason: RandomGenerator.paragraph(),
    affected_data_ref: RandomGenerator.paragraph(),
    target_article_id: null,
    target_comment_id: null,
    abuse_report_id: null,
  } satisfies IDiscussionBoardModerationAction.ICreate;
  const moderationAction =
    await api.functional.discussionBoard.admin.moderationActions.create(
      connection,
      { body: actionInput },
    );
  typia.assert(moderationAction);

  // 5. Admin A fetches admin B by UUID
  const detail = await api.functional.discussionBoard.admin.admins.at(
    connection,
    {
      adminId: adminB.id,
    },
  );
  typia.assert(detail);
  TestValidator.equals(
    "should fetch all primary admin profile fields",
    detail.id,
    adminB.id,
  );
  TestValidator.equals(
    "should match display name",
    detail.display_name,
    displayNameB,
  );
  TestValidator.equals("should match email", detail.email, emailB);
  TestValidator.equals(
    "should expose correct is_locked state",
    detail.is_locked,
    false,
  );
  TestValidator.equals("should not be deleted", detail.deleted_at, null);

  // 6. Try to fetch a non-existent admin
  await TestValidator.error(
    "should fail for non-existent adminId",
    async () => {
      await api.functional.discussionBoard.admin.admins.at(connection, {
        adminId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );

  // 7/8. Simulate locked/deleted admin fetch failure: Not implemented due to lack of mutation endpoint for lock/delete
  // (Would require a lock/unlock/delete endpoint, which isn't exposed in the provided API)

  // 9. Unauthenticated fetch (missing token): create fresh connection without headers
  const unauthConn = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated fetch is denied", async () => {
    await api.functional.discussionBoard.admin.admins.at(unauthConn, {
      adminId: adminB.id,
    });
  });
}
