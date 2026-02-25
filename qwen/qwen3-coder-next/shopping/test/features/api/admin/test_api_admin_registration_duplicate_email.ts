import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_registration_duplicate_email(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for initial registration
  const adminConnection: api.IConnection = { host: connection.host };
  // Step 1: Register initial admin account
  const adminCredentials = {
    email: "testadmin@example.com",
    password: "Admin@1234",
  } satisfies IShoppingMallAdmin.IJoin;
  const registeredAdmin = await authorize_admin_join(adminConnection, {
    body: adminCredentials,
  });
  typia.assert(registeredAdmin);
  // Step 2: Attempt to register duplicate admin account with same email
  const duplicateCredentials = {
    email: "testadmin@example.com", // Same email as above
    password: "Different@1234",
  } satisfies IShoppingMallAdmin.IJoin;
  // Should throw error due to duplicate email
  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      await authorize_admin_join(adminConnection, {
        body: duplicateCredentials,
      });
    },
  );
}
