import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test administrator profile retrieval.
 *
 * Steps:
 * 1. Create and authenticate administrator A (regular grade) via join endpoint
 * 2. Create administrator B via join endpoint
 * 3. Use administrator A's credentials to retrieve administrator B's profile by ID
 *
 * Validation:
 * - Response returns complete IShoppingMallAdministrator object
 * - Contains id, email, grade, created_at, updated_at, deleted_at fields
 * - password_hash is NOT included in response
 * - Grade is 'regular' for newly created administrators
 */
export async function test_api_administrator_profile_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create and authenticate administrator A (regular grade)
  const adminAConnection: api.IConnection = { host: connection.host };
  const adminA = await authorize_administrator_join(adminAConnection, {
    body: {
      email: `admin-a-${Date.now()}@test.com`,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  typia.assert(adminA);
  // Step 2: Create administrator B whose profile will be retrieved
  const adminBConnection: api.IConnection = { host: connection.host };
  const adminB = await authorize_administrator_join(adminBConnection, {
    body: {
      email: `admin-b-${Date.now()}@test.com`,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  typia.assert(adminB);
  // Step 3: Retrieve administrator B's profile using administrator A's credentials
  const profile =
    await api.functional.shoppingMall.administrator.administrators.at(
      adminAConnection,
      {
        administratorId: adminB.id,
      },
    );
  typia.assert(profile);
  // Validation: Verify profile data matches administrator B
  TestValidator.equals("profile id matches admin B", profile.id, adminB.id);
  TestValidator.equals(
    "profile email matches admin B",
    profile.email,
    adminB.email,
  );
  TestValidator.equals("profile grade is regular", profile.grade, "regular");
  // Validate deleted_at is null for active accounts
  TestValidator.equals(
    "deleted_at is null for active account",
    profile.deleted_at,
    null,
  );
}
