import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test that an authenticated admin can successfully retrieve another active admin's complete profile information.
 * 1. Register and authenticate as an admin user (actor 1)
 * 2. Create a second admin account to serve as the target for profile retrieval (actor 2)
 * 3. Call the GET endpoint with the second admin's UUID
 * 4. Verify the response contains all expected fields
 * 5. Confirm deletedAt is null for active accounts
 * 6. Validate business logic: retrieved admin data matches the created admin data
 */
export async function test_api_admin_retrieve_active_admin_profile(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as admin user (actor 1)
  const admin1Connection: api.IConnection = { host: connection.host };
  const admin1 = await authorize_admin_join(admin1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneAdmin.IJoin,
  });
  typia.assert(admin1);
  // 2. Create a second admin account to serve as the target (actor 2)
  const admin2Connection: api.IConnection = { host: connection.host };
  const admin2 = await authorize_admin_join(admin2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password456",
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
      bio: null,
      avatar: typia.random<string & tags.Format<"uri">>() satisfies string as string,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneAdmin.IJoin,
  });
  typia.assert(admin2);
  // 3. Admin 1 retrieves Admin 2's profile using admin1Connection
  const retrievedAdmin = await api.functional.redditClone.admin.admins.at(
    admin1Connection,
    {
      adminId: admin2.id,
    },
  );
  typia.assert(retrievedAdmin);
  // 4. Verify all expected fields are present and match
  TestValidator.equals("admin id matches", retrievedAdmin.id, admin2.id);
  TestValidator.equals(
    "admin email matches",
    retrievedAdmin.email,
    admin2.email,
  );
  TestValidator.equals(
    "admin username matches",
    retrievedAdmin.username,
    admin2.username,
  );
  TestValidator.equals(
    "admin display name matches",
    retrievedAdmin.displayName,
    admin2.displayName,
  );
  TestValidator.equals("admin bio matches", retrievedAdmin.bio, admin2.bio);
  TestValidator.equals(
    "admin avatar matches",
    retrievedAdmin.avatar,
    admin2.avatar,
  );
  // 5. Confirm deletedAt is null for active accounts
  TestValidator.equals(
    "deletedAt is null for active admin",
    retrievedAdmin.deletedAt,
    null,
  );
  // 6. Verify timestamps are present and valid
  TestValidator.predicate("createdAt is valid date-time", () => {
    const date = new Date(retrievedAdmin.createdAt);
    return !isNaN(date.getTime());
  });
  TestValidator.predicate("updatedAt is valid date-time", () => {
    const date = new Date(retrievedAdmin.updatedAt);
    return !isNaN(date.getTime());
  });
  // 7. Verify createdAt <= updatedAt (business logic)
  TestValidator.predicate("createdAt is before or equal to updatedAt", () => {
    const created = new Date(retrievedAdmin.createdAt).getTime();
    const updated = new Date(retrievedAdmin.updatedAt).getTime();
    return created <= updated;
  });
}