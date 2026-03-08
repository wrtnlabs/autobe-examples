import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminRequestRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_request_view_by_own_requester(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authorize admin (create own admin account via join)
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create a new connection using the authorized admin's token
  const authorizedAdminConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: adminAuth.token.access,
    },
  };
  // 3. Generate a random admin request for testing
  const adminRequest = typia.random<IEcommerceMallAdminRequestRequest>();
  typia.assert(adminRequest);
  // 4. Retrieve the admin's own request (should succeed)
  const retrievedRequest =
    await api.functional.ecommerceMall.admin.admin_requests.at(
      authorizedAdminConnection,
      {
        adminRequestId: adminRequest.id,
      },
    );
  typia.assert(retrievedRequest);
  // 5. Validate that the retrieved request matches the original
  TestValidator.equals(
    "request ID matches",
    retrievedRequest.id,
    adminRequest.id,
  );
  TestValidator.equals(
    "reason matches",
    retrievedRequest.reason,
    adminRequest.reason,
  );
  TestValidator.equals(
    "request status matches",
    retrievedRequest.request_status,
    adminRequest.request_status,
  );
  // 6. Verify the admin association
  TestValidator.equals(
    "admin ID matches",
    retrievedRequest.admin.id,
    adminAuth.id,
  );
  TestValidator.equals(
    "admin email matches",
    retrievedRequest.admin.email,
    adminAuth.email,
  );
  // 7. Verify timestamps are in correct format
  const createdAtDate = new Date(retrievedRequest.created_at);
  TestValidator.predicate(
    "created_at is valid date",
    createdAtDate instanceof Date && !isNaN(createdAtDate.getTime()),
  );
  // 8. Test authorization boundary: try to access another admin's request (should fail)
  const otherAdminRequestId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("cannot view other admin's request", async () => {
    await api.functional.ecommerceMall.admin.admin_requests.at(
      authorizedAdminConnection,
      {
        adminRequestId: otherAdminRequestId,
      },
    );
  });
}
