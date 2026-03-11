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

export async function test_api_admin_profile_grade_verification(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a regular administrator account (default grade is 'regular')
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
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
  typia.assert(adminAuth);
  // 2. Verify the admin was created with 'regular' grade by default
  TestValidator.equals("admin grade is regular", adminAuth.grade, "regular");
  // 3. Call GET /discussionBoard/admin/admins/{adminId} to retrieve full profile
  const adminProfile = await api.functional.discussionBoard.admin.admins.at(
    adminConnection,
    {
      adminId: adminAuth.id,
    },
  );
  typia.assert(adminProfile);
  // 4. Verify the grade field in the profile response matches 'regular'
  TestValidator.equals("profile grade matches", adminProfile.grade, "regular");
  // 5. Validate member information is properly included
  TestValidator.predicate("member exists", adminProfile.member !== null);
  TestValidator.equals("member is admin", adminProfile.member.is_admin, true);
  // 6. Validate timestamps exist and are properly formatted
  TestValidator.predicate(
    "created_at exists",
    adminProfile.created_at !== null,
  );
  TestValidator.predicate(
    "updated_at exists",
    adminProfile.updated_at !== null,
  );
  // 7. Verify deleted_at is null (active admin)
  TestValidator.equals("admin is active", adminProfile.deleted_at, null);
  // 8. Document privilege scope for regular grade
  // Regular admins can: manage sections, delete content, ban users
  // Super admins can additionally: approve admin requests, manage other admins' grades
  TestValidator.predicate(
    "grade indicates valid privilege level",
    adminProfile.grade === "regular" || adminProfile.grade === "super",
  );
}
