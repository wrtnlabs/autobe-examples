import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test super administrator registration email uniqueness constraint enforcement.
 *
 * Validates that the system prevents duplicate email addresses during super administrator registration. The test first creates a super admin account successfully, then attempts to register another account with the same email address, expecting the operation to fail.
 *
 * This test ensures the email uniqueness constraint is properly enforced at the business logic level. The constraint is critical for maintaining account integrity, preventing duplicate privileged accounts, and ensuring each super administrator can be uniquely identified for authentication and audit purposes.
 *
 * 1. Generate a unique email address for the first super admin registration.
 * 2. Successfully register the first super admin account using authorize_super_admin_join.
 * 3. Attempt to register a second super admin with the same email address.
 * 4. Verify the second registration attempt fails, enforcing the uniqueness constraint.
 */
export async function test_api_super_admin_join_duplicate_email(
  connection: api.IConnection,
): Promise<void> {
  // Generate unique email for first registration
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  // 1. First super admin registration - should succeed
  const firstConnection: api.IConnection = { host: connection.host };
  const firstAdmin = await authorize_super_admin_join(firstConnection, {
    body: {
      email: email,
      password: password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSuperAdmin.IJoin,
  });
  typia.assert(firstAdmin);
  // 2. Second registration with same email - should fail
  const secondConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("duplicate email rejected", async () => {
    await authorize_super_admin_join(secondConnection, {
      body: {
        email: email,
        password: password,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallSuperAdmin.IJoin,
    });
  });
}
