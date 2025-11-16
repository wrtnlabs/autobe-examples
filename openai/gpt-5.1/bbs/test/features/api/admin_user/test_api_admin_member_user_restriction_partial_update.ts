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
 * Validate partial update behavior for member user restrictions by an admin.
 *
 * Business goal: Ensure that when an admin performs a partial update on a
 * member user's restriction using IDiscussionBoardMemberuserRestriction.IUpdate
 * with only a subset of fields (specifically ended_at), the backend updates
 * only the provided fields and preserves all unspecified fields and
 * relationships.
 *
 * Steps:
 *
 * 1. Admin joins the system via /auth/adminUser/join, establishing an
 *    authenticated admin context.
 * 2. Create an initial restriction for a randomly generated memberUserId via POST
 *    /discussionBoard/adminUser/memberUsers/{memberUserId}/restriction using
 *    IDiscussionBoardMemberuserRestriction.ICreate, setting restriction_level,
 *    reason_category, and started_at while omitting ended_at.
 * 3. Partially update the restriction via PUT
 *    /discussionBoard/adminUser/memberUsers/{memberUserId}/restriction using
 *    IDiscussionBoardMemberuserRestriction.IUpdate that only sets ended_at to a
 *    new future timestamp.
 * 4. Assert that:
 *
 *    - Restriction_level, reason_category, and started_at are unchanged.
 *    - Ended_at is updated to the new value.
 *    - Created_at is unchanged while updated_at is advanced.
 *    - The embedded memberUser summary (id, display_name, account_status,
 *         created_at) remains identical, proving the relationship is stable.
 */
export async function test_api_admin_member_user_restriction_partial_update(
  connection: api.IConnection,
) {
  // 1. Register an admin user and obtain authenticated admin context
  const adminJoinBody = typia.random<IDiscussionBoardAdminUserJoin.IRequest>();

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Prepare target memberUserId (UUID)
  const memberUserId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Create initial restriction for the member user
  const baselineRestriction: IDiscussionBoardMemberuserRestriction =
    await api.functional.discussionBoard.adminUser.memberUsers.restriction.create(
      connection,
      {
        memberUserId,
        body: {
          restriction_level: "posting_restriction",
          reason_category: "repeated_violations",
          started_at: new Date().toISOString(),
        } satisfies IDiscussionBoardMemberuserRestriction.ICreate,
      },
    );
  typia.assert(baselineRestriction);

  // Ensure ended_at is initially null/undefined
  TestValidator.equals(
    "initial restriction ended_at should be null or undefined",
    baselineRestriction.ended_at ?? null,
    null,
  );

  // 4. Perform partial update: only ended_at is set
  const newEndedAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  const updatedRestriction: IDiscussionBoardMemberuserRestriction =
    await api.functional.discussionBoard.adminUser.memberUsers.restriction.update(
      connection,
      {
        memberUserId,
        body: {
          ended_at: newEndedAt,
        } satisfies IDiscussionBoardMemberuserRestriction.IUpdate,
      },
    );
  typia.assert(updatedRestriction);

  // 5. Assertions on partial update behavior
  // restriction_level unchanged
  TestValidator.equals(
    "restriction_level remains unchanged after partial update",
    updatedRestriction.restriction_level,
    baselineRestriction.restriction_level,
  );

  // reason_category unchanged
  TestValidator.equals(
    "reason_category remains unchanged after partial update",
    updatedRestriction.reason_category,
    baselineRestriction.reason_category,
  );

  // started_at unchanged
  TestValidator.equals(
    "started_at remains unchanged after partial update",
    updatedRestriction.started_at,
    baselineRestriction.started_at,
  );

  // ended_at updated to new value
  TestValidator.equals(
    "ended_at is updated to the new scheduled end timestamp",
    updatedRestriction.ended_at,
    newEndedAt,
  );

  // created_at unchanged
  TestValidator.equals(
    "created_at remains unchanged after partial update",
    updatedRestriction.created_at,
    baselineRestriction.created_at,
  );

  // updated_at is advanced (greater than baseline.updated_at)
  const baselineUpdatedAt = new Date(baselineRestriction.updated_at).getTime();
  const updatedUpdatedAt = new Date(updatedRestriction.updated_at).getTime();

  TestValidator.predicate(
    "updated_at is advanced after partial update",
    updatedUpdatedAt > baselineUpdatedAt,
  );

  // memberUser summary relationship remains valid and unchanged
  TestValidator.equals(
    "memberUser.id remains unchanged after partial update",
    updatedRestriction.memberUser.id,
    baselineRestriction.memberUser.id,
  );

  TestValidator.equals(
    "memberUser.display_name remains unchanged after partial update",
    updatedRestriction.memberUser.display_name,
    baselineRestriction.memberUser.display_name,
  );

  TestValidator.equals(
    "memberUser.account_status remains unchanged after partial update",
    updatedRestriction.memberUser.account_status,
    baselineRestriction.memberUser.account_status,
  );

  TestValidator.equals(
    "memberUser.created_at remains unchanged after partial update",
    updatedRestriction.memberUser.created_at,
    baselineRestriction.memberUser.created_at,
  );
}
