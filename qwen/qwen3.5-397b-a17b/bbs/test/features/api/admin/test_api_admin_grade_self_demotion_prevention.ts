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

export async function test_api_admin_grade_self_demotion_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin account using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Verify admin was created with super grade
  TestValidator.equals("admin grade is super", admin.grade, "super");
  // 3. Attempt self-demotion - should fail with 403 Forbidden
  // The business rule prevents super admins from demoting themselves
  await TestValidator.error("self-demotion rejected", async () => {
    await api.functional.discussionBoard.admin.admins.update(adminConnection, {
      adminId: admin.id,
      body: {
        grade: "regular",
      } satisfies IDiscussionBoardAdmin.IUpdate,
    });
  });
  // 4. Verify the admin's grade remains 'super' after failed attempt
  // Since the update was rejected, the grade should still be 'super'
  TestValidator.equals(
    "grade remains super after failed demotion",
    admin.grade,
    "super",
  );
}
