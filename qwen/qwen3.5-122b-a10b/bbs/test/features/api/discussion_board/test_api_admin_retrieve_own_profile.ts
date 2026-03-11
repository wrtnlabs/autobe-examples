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
 * Test that an authenticated administrator can retrieve their own public profile information.
 * This validates self-access functionality where an admin queries their own profile using their adminId.
 * The response should include all public fields (id, display_name, bio, grade, created_at, updated_at)
 * with sensitive authentication credentials properly excluded.
 */
export async function test_api_admin_retrieve_own_profile(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
      grade: RandomGenerator.pick(["regular", "super"]),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create admin-specific connection for profile retrieval
  const profileConnection: api.IConnection = { host: connection.host };
  profileConnection.headers = adminConnection.headers;
  // 3. Retrieve the admin's own profile
  const profile = await api.functional.discussionBoard.admins.at(
    profileConnection,
    {
      adminId: adminAuth.id,
    },
  );
  typia.assert(profile);
  // 4. Validate response values match the created admin
  TestValidator.equals("admin ID matches", profile.id, adminAuth.id);
  TestValidator.equals(
    "display name matches",
    profile.display_name,
    adminAuth.display_name,
  );
  TestValidator.equals("bio matches", profile.bio, adminAuth.bio);
  TestValidator.equals("grade matches", profile.grade, adminAuth.grade);
}
