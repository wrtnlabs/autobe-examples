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
 * Test that a super administrator can successfully retrieve another super administrator's account details.
 *
 * Test Flow:
 * 1. Register first super administrator (requesting user) to establish authentication context
 * 2. Register second super administrator (target user) with a unique email
 * 3. Use first super admin's authenticated connection to retrieve second super admin's details
 * 4. Validate the response contains all required fields per ISummary schema
 * 5. Verify the returned email and ID match the target super admin's registered values
 * 6. Confirm timestamps are valid ISO datetime strings
 */
export async function test_api_super_admin_retrieve_peer_account(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register first super administrator (requesting user)
  const firstSuperAdminConnection: api.IConnection = { host: connection.host };
  const firstSuperAdmin = await authorize_super_admin_join(
    firstSuperAdminConnection,
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
  typia.assert(firstSuperAdmin);
  // 2. Register second super administrator (target user)
  const targetEmail = typia.random<string & tags.Format<"email">>();
  const secondSuperAdminConnection: api.IConnection = { host: connection.host };
  const secondSuperAdmin = await authorize_super_admin_join(
    secondSuperAdminConnection,
    {
      body: {
        email: targetEmail,
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallSuperAdmin.IJoin,
    },
  );
  typia.assert(secondSuperAdmin);
  // 3. Retrieve second super admin's details using first super admin's connection
  const retrievedSuperAdmin =
    await api.functional.shoppingMall.superAdmin.super_admins.at(
      firstSuperAdminConnection,
      {
        superAdminId: secondSuperAdmin.id,
      },
    );
  typia.assert(retrievedSuperAdmin);
  // 4. Validate response contains required fields and matches expected values
  TestValidator.equals(
    "super admin ID matches",
    retrievedSuperAdmin.id,
    secondSuperAdmin.id,
  );
  TestValidator.equals(
    "email matches registered email",
    retrievedSuperAdmin.email,
    targetEmail,
  );
  TestValidator.predicate("created_at is valid ISO datetime", () => {
    const date = new Date(retrievedSuperAdmin.created_at);
    return !isNaN(date.getTime());
  });
  TestValidator.predicate("updated_at is valid ISO datetime", () => {
    const date = new Date(retrievedSuperAdmin.updated_at);
    return !isNaN(date.getTime());
  });
  TestValidator.predicate("updated_at is after or equal to created_at", () => {
    return (
      new Date(retrievedSuperAdmin.updated_at).getTime() >=
      new Date(retrievedSuperAdmin.created_at).getTime()
    );
  });
}
