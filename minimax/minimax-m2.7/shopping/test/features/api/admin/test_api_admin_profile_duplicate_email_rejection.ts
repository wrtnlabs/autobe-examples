import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_admin_profile_duplicate_email_rejection(
  connection: api.IConnection,
): Promise<void> {
  // Test that a super administrator cannot update an admin's email to an email already in use by another active admin.
  // 1. SuperAdmin A joins to authenticate as the acting super administrator
  const superAdminAConnection: api.IConnection = { host: connection.host };
  const superAdminA = await authorize_super_admin_join(superAdminAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(superAdminA);
  // 2. SuperAdmin B joins to create the target admin account
  const superAdminBConnection: api.IConnection = { host: connection.host };
  const superAdminB = await authorize_super_admin_join(superAdminBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(superAdminB);
  // 3. SuperAdmin C joins to create another admin with an email that will be used for duplicate test
  const superAdminCConnection: api.IConnection = { host: connection.host };
  const superAdminC = await authorize_super_admin_join(superAdminCConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(superAdminC);
  // Store SuperAdmin B's original email for later verification
  const originalSuperAdminBEmail = superAdminB.email;
  // 4. SuperAdmin A attempts to update SuperAdmin B's email to SuperAdmin C's email (duplicate)
  // This should fail with 409 Conflict or 400 Bad Request
  await TestValidator.error("duplicate email should be rejected", async () => {
    await api.functional.ecommerceMall.superAdmin.admins.update(
      superAdminAConnection,
      {
        adminId: superAdminB.id,
        body: {
          email: superAdminC.email,
        } satisfies IEcommerceMallAdmin.IUpdate,
      },
    );
  });
  // 5. Verify SuperAdmin B's email remains unchanged
  TestValidator.predicate(
    "SuperAdmin B's email should remain unchanged",
    originalSuperAdminBEmail === superAdminB.email,
  );
}
