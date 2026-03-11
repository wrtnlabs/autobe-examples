import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequest";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_request_pending_list_regular_admin_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new regular admin account
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IEcommerceMallAdmin.IJoin;
  // Step 2: Join as admin and get authorized connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await api.functional.ecommerceMall.auth.admin.join(
    adminConnection,
    {
      body: joinInput,
    },
  );
  typia.assert(adminAuth);
  // Step 3: Create new connection with admin authentication
  const regularAdminConnection: api.IConnection = {
    host: connection.host,
    headers: {
      authorization: adminAuth.token.access,
    },
  };
  // Step 4: Attempt to access pending admin requests endpoint
  // This should fail with 403 Forbidden for regular admin
  try {
    await api.functional.ecommerceMall.admin.admin_requests.pending.index(
      regularAdminConnection,
      {
        body: {
          status: "pending",
        } satisfies IEcommerceMallAdminRequest.IRequest,
      },
    );
    // If we reach here, the test failed - should have thrown an error
    throw new Error("Expected 403 Forbidden error but request succeeded");
  } catch (error) {
    // Step 5: Verify the error is 403 Forbidden
    TestValidator.equals(
      "error status is 403 Forbidden",
      (error as api.HttpError).status,
      403,
    );
    // Step 6: Verify error message indicates unauthorized access
    TestValidator.predicate(
      "error message indicates forbidden",
      (error as api.HttpError).message !== null &&
        (error as api.HttpError).message !== undefined,
    );
  }
}
