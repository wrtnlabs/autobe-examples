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

export async function test_api_admin_profile_soft_deleted_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create target admin account (the one whose profile will be retrieved)
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
    },
  });
  typia.assert(targetAdmin);
  // Step 2: Create separate querying admin for authentication
  const queryingAdminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(queryingAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // Step 3: Retrieve target admin profile using querying admin's connection
  const profile = await api.functional.discussionBoard.admin.admins.at(
    queryingAdminConnection,
    {
      adminId: targetAdmin.id,
    },
  );
  typia.assert(profile);
  // Step 4: Validate profile data matches created admin
  TestValidator.equals("admin ID matches", profile.id, targetAdmin.id);
  TestValidator.equals("grade matches", profile.grade, targetAdmin.grade);
  TestValidator.equals(
    "member ID matches",
    profile.member.id,
    targetAdmin.member.id,
  );
  TestValidator.equals(
    "display name matches",
    profile.member.display_name,
    targetAdmin.member.display_name,
  );
  // Step 5: Confirm admin is active (deleted_at is null for active admins)
  TestValidator.predicate(
    "admin is active (not soft deleted)",
    profile.deleted_at === null,
  );
}
