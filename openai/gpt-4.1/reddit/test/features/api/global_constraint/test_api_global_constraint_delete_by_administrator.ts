import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformGlobalConstraint } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGlobalConstraint";

/**
 * Validate successful deletion of a global constraint entry by an
 * administrator.
 *
 * 1. Register a new administrator
 * 2. Authenticate as the created administrator
 * 3. Create a test global constraint entry (simulate, as there is no create API)
 * 4. Delete the global constraint via
 *    api.functional.communityPlatform.administrator.globalConstraints.erase
 * 5. Validate returned object matches deleted constraint key
 * 6. (Cannot check actual registry removal or subsequent not found since no GET
 *    endpoint exists)
 */
export async function test_api_global_constraint_delete_by_administrator(
  connection: api.IConnection,
) {
  // 1. Register and authenticate administrator
  const adminBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdministrator.ICreate;
  const adminAuth: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminBody,
    });
  typia.assert(adminAuth);
  TestValidator.equals(
    "administrator email should match input",
    adminAuth.email,
    adminBody.email,
  );

  // 2. Create a simulated global constraint (simulate by using typia.random)
  const constraint: ICommunityPlatformGlobalConstraint =
    typia.random<ICommunityPlatformGlobalConstraint>();

  // 3. Admin deletes the global constraint by constraintKey
  const deleted: ICommunityPlatformGlobalConstraint =
    await api.functional.communityPlatform.administrator.globalConstraints.erase(
      connection,
      { constraintKey: constraint.constraint_key },
    );
  typia.assert(deleted);
  TestValidator.equals(
    "deleted constraint key matches",
    deleted.constraint_key,
    constraint.constraint_key,
  );

  // 4. (No GET/verify endpoint exists to ensure non-existence; logic stops here)
}
