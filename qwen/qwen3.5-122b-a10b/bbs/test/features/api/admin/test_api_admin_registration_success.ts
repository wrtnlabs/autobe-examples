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
 * Test the successful registration of a new administrator account.
 *
 * This test verifies that a member can submit valid registration credentials
 * including email, password (minimum 8 characters), display name (1-100 characters),
 * optional bio (max 500 characters), and grade selection (regular or super).
 * Upon successful registration, the system creates the admin account with
 * bcrypt-hashed password, generates JWT access token (15-minute expiry) and
 * refresh token (7-day expiry), creates a session record with client metadata,
 * and returns the complete admin profile with authentication tokens.
 */
export async function test_api_admin_registration_success(
  connection: api.IConnection,
): Promise<void> {
  // Create admin-specific connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Generate valid registration data
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16), // Minimum 8 characters
    display_name: RandomGenerator.name(), // 1-100 characters
    bio: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }), // Optional, max 500 chars
    grade: RandomGenerator.pick(["regular", "super"] as const),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IDiscussionBoardAdmin.IJoin;
  // Register admin account using utility function
  const admin = await authorize_admin_join(adminConnection, {
    body: joinBody,
  });
  // Validate response structure
  typia.assert(admin);
  // Validate admin profile fields
  TestValidator.equals(
    "admin id is UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      admin.id,
    ),
    true,
  );
  TestValidator.equals("email matches input", admin.email, joinBody.email);
  TestValidator.equals(
    "display_name matches input",
    admin.display_name,
    joinBody.display_name,
  );
  TestValidator.equals("bio matches input", admin.bio, joinBody.bio);
  TestValidator.equals("grade matches input", admin.grade, joinBody.grade);
  TestValidator.predicate(
    "created_at is date-time",
    /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])(T|\s)([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\.[0-9]{1,9})?(Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])$/i.test(
      admin.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at is date-time",
    /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])(T|\s)([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\.[0-9]{1,9})?(Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])$/i.test(
      admin.updated_at,
    ),
  );
  TestValidator.equals(
    "deleted_at is null for active account",
    admin.deleted_at,
    null,
  );
  // Validate token structure
  TestValidator.predicate("access token exists", admin.token.access.length > 0);
  TestValidator.predicate(
    "refresh token exists",
    admin.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is date-time",
    /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])(T|\s)([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\.[0-9]{1,9})?(Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])$/i.test(
      admin.token.expired_at,
    ),
  );
  TestValidator.predicate(
    "refreshable_until is date-time",
    /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])(T|\s)([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\.[0-9]{1,9})?(Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])$/i.test(
      admin.token.refreshable_until,
    ),
  );
  // Validate token expiry is in the future
  const expiredAt = new Date(admin.token.expired_at);
  const refreshableUntil = new Date(admin.token.refreshable_until);
  const now = new Date();
  TestValidator.predicate("expired_at is in the future", expiredAt > now);
  TestValidator.predicate(
    "refreshable_until is in the future",
    refreshableUntil > now,
  );
  TestValidator.predicate(
    "refreshable_until is after expired_at",
    refreshableUntil > expiredAt,
  );
}
