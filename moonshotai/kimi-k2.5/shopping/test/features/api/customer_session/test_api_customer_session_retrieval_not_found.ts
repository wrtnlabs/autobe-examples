import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerSession";
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

/**
 * Test retrieval of a non-existent customer session.
 * After authenticating as super admin, attempt to retrieve a session using
 * a randomly generated UUID that does not exist in the database.
 * The system should return 404 Not Found.
 */
export async function test_api_customer_session_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Generate a random UUID that doesn't exist
  const nonExistentSessionId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to retrieve the non-existent session - should throw 404
  await TestValidator.httpError(
    "should return 404 for non-existent session",
    404,
    async () => {
      await api.functional.ecommerceMall.superAdmin.customer_sessions.at(
        superAdminConnection,
        { sessionId: nonExistentSessionId },
      );
    },
  );
}
