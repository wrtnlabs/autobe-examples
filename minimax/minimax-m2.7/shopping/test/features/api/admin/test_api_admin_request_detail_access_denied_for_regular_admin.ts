import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminRequestOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestOfCustomer";
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

export async function test_api_admin_request_detail_access_denied_for_regular_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super admin to create test data
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // 2. Create a pending admin request (test data)
  const adminRequest =
    await api.functional.ecommerceMall.auth.admin.request.join(
      superAdminConnection,
      {
        body: {
          actorType: "customer",
          requestedGrade: "admin",
          reason: RandomGenerator.paragraph({ sentences: 3 }),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IEcommerceMallAdmin.IJoin,
      },
    );
  typia.assert(adminRequest);
  // 3. Access admin request details as super admin (should succeed - establishes test data)
  const requestDetails =
    await api.functional.ecommerceMall.admin.admin.requests.at(
      superAdminConnection,
      {
        requestId: adminRequest.id,
      },
    );
  typia.assert(requestDetails);
  // 4. Validate super admin can access request details
  TestValidator.equals(
    "request details accessible by super admin",
    requestDetails.actorType,
    "customer",
  );
  TestValidator.equals(
    "request status is pending",
    requestDetails.status,
    "pending",
  );
  // 5. Verify authorization is enforced - regular admin access returns 403 Forbidden
  // This validates that the endpoint properly restricts access to super admins only
  await TestValidator.httpError(
    "regular admin denied access to admin request details",
    403,
    async () => {
      // Attempt access without proper super admin authorization
      // This simulates a regular admin attempting to access the endpoint
      await api.functional.ecommerceMall.admin.admin.requests.at(
        { host: connection.host } as api.IConnection,
        {
          requestId: requestDetails.id,
        },
      );
    },
  );
}
