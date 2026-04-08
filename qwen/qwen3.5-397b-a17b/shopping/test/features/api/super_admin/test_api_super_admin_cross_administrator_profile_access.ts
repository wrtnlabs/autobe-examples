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
 * Test super administrator cross-administrator profile access for platform governance.
 *
 * Validates that a super administrator can retrieve another super administrator's profile information. This capability is essential for platform governance, allowing super administrators to oversee and manage other super administrator accounts within the system.
 *
 * The test creates two distinct super administrator accounts, authenticates as the first one, and attempts to retrieve the profile of the second super administrator. This verifies the business rule that super administrators have visibility into peer accounts for administrative oversight purposes.
 *
 * 1. Register first super administrator account (test executor) with random credentials.
 * 2. Register second super administrator account (target profile) with different random credentials.
 * 3. Authenticate as the first super administrator using the token from registration.
 * 4. Retrieve the second super administrator's profile using their account ID.
 * 5. Validate response structure contains all required fields: id, email, created_at, updated_at, deleted_at.
 * 6. Verify the retrieved profile matches the target super administrator by comparing ID and email.
 * 7. Confirm deleted_at is null indicating the account is active.
 */
export async function test_api_super_admin_cross_administrator_profile_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create connection and register first super administrator (test executor)
  const firstAdminConnection: api.IConnection = { host: connection.host };
  const firstAdminAuth = await authorize_super_admin_join(
    firstAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallSuperAdmin.IJoin,
    },
  );
  typia.assert(firstAdminAuth);
  // 2. Register second super administrator (target profile)
  const secondAdminAuth = await authorize_super_admin_join(
    { host: connection.host },
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallSuperAdmin.IJoin,
    },
  );
  typia.assert(secondAdminAuth);
  // 3. Retrieve second super administrator's profile using first admin's connection
  const retrievedProfile =
    await api.functional.shoppingMall.superAdmin.super_admins.at(
      firstAdminConnection,
      {
        superAdminId: secondAdminAuth.id,
      },
    );
  typia.assert(retrievedProfile);
  // 4. Validate profile matches target super administrator (business logic)
  TestValidator.equals(
    "profile ID matches target",
    retrievedProfile.id,
    secondAdminAuth.id,
  );
  TestValidator.equals(
    "profile email matches target",
    retrievedProfile.email,
    secondAdminAuth.email,
  );
  TestValidator.equals(
    "profile deleted_at is null (active account)",
    retrievedProfile.deleted_at,
    null,
  );
}
