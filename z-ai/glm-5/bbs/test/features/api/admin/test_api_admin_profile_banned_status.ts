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

export async function test_api_admin_profile_banned_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate as administrator
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
    },
  });
  typia.assert(adminAuth);
  // 2. Retrieve the admin's profile by ID
  const adminProfile = await api.functional.discussionBoard.admin.admins.at(
    adminConnection,
    {
      adminId: adminAuth.id,
    },
  );
  typia.assert(adminProfile);
  // 3. Validate all required fields are present
  TestValidator.equals("admin ID matches", adminProfile.id, adminAuth.id);
  TestValidator.equals("email matches", adminProfile.email, adminAuth.email);
  TestValidator.equals(
    "displayName matches",
    adminProfile.displayName,
    adminAuth.displayName,
  );
  // 4. Verify ban status fields exist (null for non-banned account)
  TestValidator.equals(
    "bannedAt is null for new admin",
    adminProfile.bannedAt,
    null,
  );
  TestValidator.equals(
    "banReason is null for new admin",
    adminProfile.banReason,
    null,
  );
  // 5. Verify deletedAt is null (account is active)
  TestValidator.equals(
    "deletedAt is null for active account",
    adminProfile.deletedAt,
    null,
  );
  // 6. Verify grade is set correctly (new admins are 'regular')
  TestValidator.equals(
    "grade is regular for new admin",
    adminProfile.grade,
    "regular",
  );
}
