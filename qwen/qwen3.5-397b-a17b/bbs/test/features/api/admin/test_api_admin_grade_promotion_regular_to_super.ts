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

export async function test_api_admin_grade_promotion_regular_to_super(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator (first admin has super privileges)
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // 2. Create regular administrator to be promoted
  const regularAdminConnection: api.IConnection = { host: connection.host };
  const regularAdmin = await authorize_admin_join(regularAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(regularAdmin);
  // Verify regular admin starts with 'regular' grade
  TestValidator.equals(
    "initial grade is regular",
    regularAdmin.grade,
    "regular",
  );
  // Store original values for comparison
  const originalMemberId = regularAdmin.member.id;
  const originalCreatedAt = regularAdmin.created_at;
  // 3. Promote regular admin to super using super admin connection
  const updatedAdmin = await api.functional.discussionBoard.admin.admins.update(
    superAdminConnection,
    {
      adminId: regularAdmin.id,
      body: {
        grade: "super",
      } satisfies IDiscussionBoardAdmin.IUpdate,
    },
  );
  typia.assert(updatedAdmin);
  // 4. Validate grade changed to super
  TestValidator.equals("grade promoted to super", updatedAdmin.grade, "super");
  // 5. Validate updated_at timestamp is updated
  TestValidator.notEquals(
    "updated_at timestamp changed",
    updatedAdmin.updated_at,
    regularAdmin.updated_at,
  );
  // 6. Validate id, member, and created_at remain unchanged
  TestValidator.equals("admin id unchanged", updatedAdmin.id, regularAdmin.id);
  TestValidator.equals(
    "member id unchanged",
    updatedAdmin.member.id,
    originalMemberId,
  );
  TestValidator.equals(
    "created_at unchanged",
    updatedAdmin.created_at,
    originalCreatedAt,
  );
  // 7. Validate member association intact
  TestValidator.equals(
    "display name preserved",
    updatedAdmin.member.display_name,
    regularAdmin.member.display_name,
  );
}
