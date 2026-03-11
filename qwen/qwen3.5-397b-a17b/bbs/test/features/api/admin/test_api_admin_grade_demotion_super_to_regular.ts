import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
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
 * Test super administrator demoting another super administrator to regular grade.
 *
 * This test validates the grade demotion workflow where a super administrator
 * demotes another super administrator to regular administrator grade. The test
 * ensures that:
 * 1. The grade changes from 'super' to 'regular'
 * 2. The updated_at timestamp is updated
 * 3. The member association and other fields remain unchanged
 * 4. Self-demotion is not being tested (different admin IDs)
 */
export async function test_api_admin_grade_demotion_super_to_regular(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first super administrator (the actor performing demotion)
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // 2. Create second super administrator (the target to be demoted)
  const targetAdminConnection: api.IConnection = { host: connection.host };
  const targetAdmin = await authorize_admin_join(targetAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(targetAdmin);
  // Verify both admins are created with super grade
  TestValidator.equals("super admin grade", superAdmin.grade, "super");
  TestValidator.equals("target admin grade", targetAdmin.grade, "super");
  TestValidator.notEquals("different admin IDs", superAdmin.id, targetAdmin.id);
  // Store original values for comparison
  const originalTargetId = targetAdmin.id;
  const originalTargetMember = targetAdmin.member;
  const originalTargetCreatedAt = targetAdmin.created_at;
  const originalTargetUpdatedAt = targetAdmin.updated_at;
  // 3. Demote target admin from super to regular using super admin connection
  const updatedAdmin = await api.functional.discussionBoard.admin.admins.update(
    superAdminConnection,
    {
      adminId: targetAdmin.id,
      body: {
        grade: "regular",
      } satisfies IDiscussionBoardAdmin.IUpdate,
    },
  );
  typia.assert(updatedAdmin);
  // 4. Validate grade changed from super to regular
  TestValidator.equals(
    "grade demoted to regular",
    updatedAdmin.grade,
    "regular",
  );
  // 5. Validate updated_at timestamp is updated
  TestValidator.notEquals(
    "updated_at changed",
    updatedAdmin.updated_at,
    originalTargetUpdatedAt,
  );
  // 6. Validate id, member, and created_at remain unchanged
  TestValidator.equals("id unchanged", updatedAdmin.id, originalTargetId);
  TestValidator.equals(
    "member unchanged",
    updatedAdmin.member.id,
    originalTargetMember.id,
  );
  TestValidator.equals(
    "created_at unchanged",
    updatedAdmin.created_at,
    originalTargetCreatedAt,
  );
  // 7. Verify admin is still active (not soft-deleted)
  TestValidator.equals("admin is active", updatedAdmin.deleted_at, null);
}
