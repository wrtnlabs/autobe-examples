import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequest";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test retrieving admin request details for a non-existent request returns 404 Not Found.
 *
 * Prerequisites:
 * 1. Authenticate as admin using /auth/admin/join to create an administrator account
 *
 * Test Steps:
 * 1. Call GET /ecommerceMall/admin/admin/requests/{requestId} with a non-existent UUID
 * 2. Verify the response returns 404 Not Found status
 * 3. Verify response body contains appropriate error message indicating the admin request was not found
 */
export async function test_api_admin_request_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Admin1234!" as string & tags.Format<"password">,
    name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEcommerceMallAdmin.IJoin;
  await authorize_admin_join(adminConnection, { body: adminJoinBody });
  // 2. Call GET with a non-existent UUID
  const nonExistentRequestId =
    "00000000-0000-0000-0000-000000000000" as string & tags.Format<"uuid">;
  // 3. Verify the response returns 404 Not Found
  await TestValidator.httpError(
    "non-existent admin request returns 404",
    404,
    async () =>
      await api.functional.ecommerceMall.admin.admin.requests.at(
        adminConnection,
        {
          requestId: nonExistentRequestId,
        },
      ),
  );
}
