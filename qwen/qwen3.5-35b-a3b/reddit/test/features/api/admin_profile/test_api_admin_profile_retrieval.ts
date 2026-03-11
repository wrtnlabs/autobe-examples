import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_profile_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create new admin account
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(16),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      avatar_url: typia.random<string & tags.Format<"uri">>() ?? null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(adminAuth);
  // 2. Retrieve admin profile using the returned admin ID
  const adminProfileConnection: api.IConnection = { host: connection.host };
  const adminProfile = await api.functional.redditPlatform.admin.admins.at(
    adminProfileConnection,
    {
      adminId: adminAuth.id,
    },
  );
  typia.assert(adminProfile);
  // 3. Validate response contains all expected fields
  TestValidator.equals("admin ID matches", adminProfile.id, adminAuth.id);
  TestValidator.equals("email matches", adminProfile.email, adminAuth.email);
  TestValidator.equals(
    "username matches",
    adminProfile.username,
    adminAuth.username,
  );
  TestValidator.equals(
    "display name matches",
    adminProfile.display_name,
    adminAuth.display_name,
  );
  // 4. Verify bio is nullable (can be null, undefined, or string)
  TestValidator.predicate(
    "bio is null, undefined, or string",
    adminProfile.bio === null ||
      adminProfile.bio === undefined ||
      typeof adminProfile.bio === "string",
  );
  // 5. Verify avatar_url is nullable (can be null, undefined, or string)
  TestValidator.predicate(
    "avatar_url is null, undefined, or string",
    adminProfile.avatar_url === null ||
      adminProfile.avatar_url === undefined ||
      typeof adminProfile.avatar_url === "string",
  );
  // 6. Verify is_active is boolean
  TestValidator.predicate(
    "is_active is boolean",
    typeof adminProfile.is_active === "boolean",
  );
  // 7. Verify created_at and updated_at are date-time strings
  TestValidator.predicate(
    "created_at is date-time string",
    typeof adminProfile.created_at === "string",
  );
  TestValidator.predicate(
    "updated_at is date-time string",
    typeof adminProfile.updated_at === "string",
  );
  // 8. Verify no sensitive data (password_hash) is in response
  const profileKeys = Object.keys(adminProfile);
  TestValidator.equals(
    "password_hash excluded from response",
    profileKeys.includes("password_hash"),
    false,
  );
}
