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
 * Test administrator registration with duplicate username rejection.
 *
 * This test verifies that the system properly rejects admin registration
 * attempts when a username is already taken by another admin account.
 * The test creates a first admin account successfully, then attempts
 * to create a second admin with the same username but different email,
 * expecting the second registration to fail.
 */
export async function test_api_admin_join_with_duplicate_username(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first admin account with a specific username
  const admin1Connection: api.IConnection = { host: connection.host };
  const firstUsername = RandomGenerator.name(1);
  const firstAdmin = await authorize_admin_join(admin1Connection, {
    body: {
      username: firstUsername,
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      bio: null,
      avatar: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneAdmin.IJoin,
  });
  typia.assert(firstAdmin);
  // Verify first admin was created successfully
  TestValidator.equals(
    "first admin username",
    firstAdmin.username,
    firstUsername,
  );
  TestValidator.predicate(
    "first admin has valid email",
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(firstAdmin.email),
  );
  // 2. Attempt to create second admin with same username but different email
  const admin2Connection: api.IConnection = { host: connection.host };
  const duplicateUsernameAttempt = async () => {
    await authorize_admin_join(admin2Connection, {
      body: {
        username: firstUsername, // Same username as first admin
        email: typia.random<string & tags.Format<"email">>(), // Different email
        password: RandomGenerator.alphaNumeric(16),
        displayName: RandomGenerator.name(),
        bio: null,
        avatar: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCloneAdmin.IJoin,
    });
  };
  // 3. Verify that duplicate username registration fails
  await TestValidator.error(
    "duplicate username rejected",
    duplicateUsernameAttempt,
  );
  // 4. Verify first admin account remains unchanged
  TestValidator.equals(
    "first admin unchanged",
    firstAdmin.username,
    firstUsername,
  );
  TestValidator.predicate(
    "first admin still active",
    firstAdmin.deletedAt === null,
  );
}
