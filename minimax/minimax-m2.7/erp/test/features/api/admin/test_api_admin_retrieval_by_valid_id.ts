import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test retrieving a specific admin account by its unique identifier.
 *
 * This test validates the GET /erpHrm/admin/admins/{adminId} endpoint by:
 * 1. Creating a new admin account via the join endpoint
 * 2. Retrieving the admin using their unique ID
 * 3. Validating the response matches IErpHrmAdmin schema structure
 */
export async function test_api_admin_retrieval_by_valid_id(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new admin account via join endpoint
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IErpHrmAdmin.IJoin,
  });
  typia.assert(authorized);
  // Step 2: Retrieve the admin using their unique ID
  const admin = await api.functional.erpHrm.admin.admins.at(adminConnection, {
    adminId: authorized.id,
  });
  // Step 3: Validate response matches IErpHrmAdmin schema
  typia.assert(admin);
  // Step 4: Validate the retrieved admin matches the created admin
  TestValidator.equals("admin ID matches", admin.id, authorized.id);
  TestValidator.equals("email matches", admin.email, authorized.email);
  TestValidator.equals(
    "display_name matches",
    admin.display_name,
    authorized.display_name,
  );
}
