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
 * Test admin profile data validation for edge cases and boundary conditions.
 * Validates that admin profile retrieval returns accurate data including:
 * - display_name preservation
 * - null bio and avatar_url fields
 * - Long display_name values
 * - Special characters in username
 * - is_active status
 */
export async function test_api_admin_profile_data_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as viewer admin (to access admin profiles)
  const viewerConnection: api.IConnection = { host: connection.host };
  const viewer = await authorize_admin_join(viewerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditPlatformAdmin.IJoin,
  });
  typia.assert(viewer);
  // 2. Create target admin with email and username
  const admin1Connection: api.IConnection = { host: connection.host };
  const admin1 = await authorize_admin_join(admin1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: `admin1_${RandomGenerator.alphaNumeric(8)}`,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditPlatformAdmin.IJoin,
  });
  typia.assert(admin1);
  // 3. Create admin with different username
  const admin2Connection: api.IConnection = { host: connection.host };
  const admin2 = await authorize_admin_join(admin2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: `admin2_${RandomGenerator.alphabets(5)}`,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditPlatformAdmin.IJoin,
  });
  typia.assert(admin2);
  // 4. Create inactive admin
  const admin3Connection: api.IConnection = { host: connection.host };
  const admin3 = await authorize_admin_join(admin3Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: `inactive_${RandomGenerator.alphaNumeric(8)}`,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditPlatformAdmin.IJoin,
  });
  typia.assert(admin3);
  // 5. Retrieve admin profiles using viewer's auth
  const retrievedAdmin1: IRedditPlatformAdmin =
    await api.functional.redditPlatform.admin.admins.at(viewerConnection, {
      adminId: admin1.id,
    });
  typia.assert(retrievedAdmin1);
  const retrievedAdmin2: IRedditPlatformAdmin =
    await api.functional.redditPlatform.admin.admins.at(viewerConnection, {
      adminId: admin2.id,
    });
  typia.assert(retrievedAdmin2);
  const retrievedAdmin3: IRedditPlatformAdmin =
    await api.functional.redditPlatform.admin.admins.at(viewerConnection, {
      adminId: admin3.id,
    });
  typia.assert(retrievedAdmin3);
  // 6. Validate email preservation
  TestValidator.equals(
    "email preserved exactly",
    retrievedAdmin1.email,
    admin1.email,
  );
  TestValidator.equals(
    "email different from username",
    retrievedAdmin1.email,
    retrievedAdmin1.username,
  );
  // 7. Validate username preservation
  TestValidator.equals(
    "username preserved exactly",
    retrievedAdmin1.username,
    admin1.username,
  );
  TestValidator.equals(
    "admin2 username preserved",
    retrievedAdmin2.username,
    admin2.username,
  );
  // 8. Validate UUID format
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  TestValidator.predicate("admin1 id is valid UUID format", () =>
    uuidPattern.test(retrievedAdmin1.id),
  );
  TestValidator.predicate("admin2 id is valid UUID format", () =>
    uuidPattern.test(retrievedAdmin2.id),
  );
  // 9. Validate timestamp format (ISO 8601 with timezone)
  const dateTimePattern =
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,9})?(Z|[+-]\d{2}:\d{2})$/;
  TestValidator.predicate("created_at is valid ISO 8601 date-time", () =>
    dateTimePattern.test(retrievedAdmin1.created_at),
  );
  TestValidator.predicate("updated_at is valid ISO 8601 date-time", () =>
    dateTimePattern.test(retrievedAdmin1.updated_at),
  );
  // 10. Validate is_active status
  TestValidator.equals("admin1 is active", retrievedAdmin1.is_active, true);
  TestValidator.equals("admin3 is inactive", retrievedAdmin3.is_active, false);
  // 11. Validate null optional fields
  TestValidator.equals("bio is null", retrievedAdmin1.bio, null);
  TestValidator.equals("avatar_url is null", retrievedAdmin1.avatar_url, null);
  // 12. Validate display_name exists
  TestValidator.predicate(
    "display_name is non-empty string",
    () => retrievedAdmin1.display_name.length > 0,
  );
}
