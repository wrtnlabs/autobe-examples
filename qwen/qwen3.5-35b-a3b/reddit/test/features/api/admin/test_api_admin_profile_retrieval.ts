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

/**
 * Test successful retrieval of an admin profile by an authenticated admin user.
 * This scenario validates the primary success path where an authenticated admin
 * can view another admin's profile information.
 */
export async function test_api_admin_profile_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register admin1 (viewer) with unique credentials
  const admin1JoinResult = await authorize_admin_join(connection, {
    body: {
      email: "admin1@example.com",
      password: "SecurePass123!",
      username: "admin_viewer",
      href: "http://localhost:3000/admin/join",
      referrer: "http://localhost:3000/admin",
      ip: "127.0.0.1",
    } satisfies IRedditPlatformAdmin.IJoin,
  });
  typia.assert(admin1JoinResult);
  // 2. Register admin2 (target) with DIFFERENT unique credentials
  const admin2JoinResult = await authorize_admin_join(connection, {
    body: {
      email: "admin2@example.com",
      password: "SecurePass456!",
      username: "admin_target",
      href: "http://localhost:3000/admin/join",
      referrer: "http://localhost:3000/admin",
      ip: "127.0.0.1",
    } satisfies IRedditPlatformAdmin.IJoin,
  });
  typia.assert(admin2JoinResult);
  // 3. Login as admin1 using admin1 credentials to obtain JWT token
  const admin1LoginConnection: api.IConnection = { host: connection.host };
  const admin1LoginResult = await authorize_admin_login(admin1LoginConnection, {
    body: {
      email: "admin1@example.com",
      password: "SecurePass123!",
    } satisfies IRedditPlatformAdmin.ILogin,
  });
  typia.assert(admin1LoginResult);
  // 4. Use admin1's auth token to GET admin2 profile
  const admin2Profile: IRedditPlatformAdmin =
    await api.functional.redditPlatform.admin.admins.at(admin1LoginConnection, {
      adminId: admin2JoinResult.id,
    });
  typia.assert(admin2Profile);
  // 5. Verify response contains expected fields
  TestValidator.equals(
    "admin id matches",
    admin2Profile.id,
    admin2JoinResult.id,
  );
  TestValidator.equals(
    "admin email matches",
    admin2Profile.email,
    "admin2@example.com",
  );
  TestValidator.equals(
    "admin username matches",
    admin2Profile.username,
    "admin_target",
  );
  TestValidator.equals(
    "admin display_name matches",
    admin2Profile.display_name,
    admin2JoinResult.display_name,
  );
  TestValidator.equals(
    "admin is_active matches",
    admin2Profile.is_active,
    admin2JoinResult.is_active,
  );
  TestValidator.equals(
    "admin created_at matches",
    admin2Profile.created_at,
    admin2JoinResult.created_at,
  );
  TestValidator.equals(
    "admin updated_at matches",
    admin2Profile.updated_at,
    admin2JoinResult.updated_at,
  );
  TestValidator.equals(
    "admin bio matches",
    admin2Profile.bio,
    admin2JoinResult.bio,
  );
  TestValidator.equals(
    "admin avatar_url matches",
    admin2Profile.avatar_url,
    admin2JoinResult.avatar_url,
  );
  // 6. Confirm password_hash is NOT included in response (security check)
  // The IRedditPlatformAdmin type does not include password_hash, so this is
  // validated by type safety. Additionally, typia.assert() ensures no extra
  // properties exist that shouldn't be there.
  // 7. Validate that timestamps are valid ISO date-time strings
  TestValidator.predicate(
    "created_at is valid ISO date-time",
    () => !isNaN(Date.parse(admin2Profile.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid ISO date-time",
    () => !isNaN(Date.parse(admin2Profile.updated_at)),
  );
}
