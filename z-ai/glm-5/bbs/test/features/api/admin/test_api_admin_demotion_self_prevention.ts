import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test that a super administrator cannot demote themselves.
 *
 * This test validates the critical business rule that prevents administrative
 * lockout scenarios where all super admins could inadvertently demote themselves.
 * The self-demotion prevention ensures continuous administrative access.
 *
 * Steps:
 * 1. Create and authenticate a new admin account
 * 2. Promote the admin to 'super' grade
 * 3. Attempt self-demotion (should be rejected with 400)
 * 4. The 400 error confirms the business rule is enforced
 */
export async function test_api_admin_demotion_self_prevention(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create and authenticate a new admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // Step 2: Promote to super grade
  // Note: This requires an existing super admin in the test environment
  const promotedAdmin =
    await api.functional.discussionBoard.admin.admins.promote(adminConnection, {
      adminId: admin.id,
      body: {
        reason: "Test promotion for self-demotion prevention test",
      } satisfies IDiscussionBoardAdmin.IPromote,
    });
  typia.assert(promotedAdmin);
  // Verify promotion was successful
  TestValidator.equals(
    "admin grade should be super",
    promotedAdmin.grade,
    "super",
  );
  // Step 3: Attempt self-demotion - should fail with 400 Bad Request
  // The 400 error confirms the self-demotion prevention business rule is enforced
  await TestValidator.httpError(
    "self-demotion should be rejected with 400",
    400,
    async () => {
      await api.functional.discussionBoard.admin.admins.demote(
        adminConnection,
        { adminId: admin.id },
      );
    },
  );
  // Note: Since there's no GET admin API available to verify the grade is unchanged,
  // we rely on the 400 error confirmation that the operation was rejected.
  // The promotedAdmin object we have confirms the grade was 'super' before the attempt,
  // and the 400 error confirms no changes were made.
}
