import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequest";
import type { IEcommerceMallAdminRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRole";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_ecommerce_mall_admin_admin_requests_create } from "../../../generate/generate_random_ecommerce_mall_admin_admin_requests_create";
import { prepare_random_ecommerce_mall_admin_request } from "../../../prepare/prepare_random_ecommerce_mall_admin_request";

export async function test_api_admin_request_rejection_records_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin and regular admin applicant
  const superAdminEmail = typia.random<string & tags.Format<"email">>();
  const superAdminPassword = RandomGenerator.alphaNumeric(16);
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(superAdminConnection, {
    body: {
      email: superAdminEmail,
      password: superAdminPassword,
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  const regularAdminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(regularAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Super admin logs in
  const superAdminLogin = await api.functional.ecommerceMall.auth.admin.login(
    superAdminConnection,
    {
      body: {
        email: superAdminEmail,
        password: superAdminPassword,
      } satisfies IEcommerceMallAdmin.ILogin,
    },
  );
  superAdminConnection.headers = {
    ...superAdminConnection.headers,
    Authorization: superAdminLogin.token.access,
  };
  // 3. Regular admin submits admin request
  const adminRequest =
    await api.functional.ecommerceMall.admin.admin_requests.create(
      regularAdminConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IEcommerceMallAdminRequest.ICreate,
      },
    );
  typia.assert(adminRequest);
  TestValidator.equals("status is pending", adminRequest.status, "pending");
  // 4. Super admin rejects the request
  const updatedRequest =
    await api.functional.ecommerceMall.admin.admin_requests.update(
      superAdminConnection,
      {
        adminRequestId: adminRequest.id,
        body: {
          status: "rejected",
          approval_notes: null,
          rejection_reason: "not qualified",
        } satisfies IEcommerceMallAdminRequest.IUpdate,
      },
    );
  typia.assert(updatedRequest);
  // 5. Validate rejection results
  TestValidator.equals("status is rejected", updatedRequest.status, "rejected");
  TestValidator.equals(
    "rejection reason recorded",
    updatedRequest.rejectionReason,
    "not qualified",
  );
  TestValidator.notEquals("super admin set", updatedRequest.superAdmin, null);
  TestValidator.equals(
    "responded_at set",
    updatedRequest.respondedAt === null,
    false,
  );
  TestValidator.equals("admin role is null", updatedRequest.adminRole, null);
}