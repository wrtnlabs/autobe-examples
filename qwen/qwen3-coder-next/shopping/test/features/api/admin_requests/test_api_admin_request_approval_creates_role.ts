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

export async function test_api_admin_request_approval_creates_role(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create new admin account via join endpoint
  const newAdminConnection: api.IConnection = { host: connection.host };
  const newAdminEmail = typia.random<string & tags.Format<"email">>();
  const newAdmin = await authorize_admin_join(newAdminConnection, {
    body: {
      email: newAdminEmail,
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(newAdmin);
  // Step 2: Login with new admin credentials
  const newAdminSession = await authorize_admin_login(newAdminConnection, {
    body: {
      email: newAdminEmail + "@test.com",
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  typia.assert(newAdminSession);
  // Step 3: Submit pending admin request from new admin account
  const request =
    await generate_random_ecommerce_mall_admin_admin_requests_create(
      newAdminConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IEcommerceMallAdminRequest.ICreate,
      },
    );
  typia.assert(request);
  TestValidator.equals("request status is pending", request.status, "pending");
  // Step 4: Login with super admin credentials
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_admin_login(superAdminConnection, {
    body: {
      email: "superadmin@test.com",
      password: "1234",
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  typia.assert(superAdmin);
  // Step 5: Approve the pending admin request
  const approvedRequest =
    await api.functional.ecommerceMall.admin.admin_requests.update(
      superAdminConnection,
      {
        adminRequestId: request.id,
        body: {
          status: "approved",
          approval_notes: "Approved by super admin",
          rejection_reason: null,
        } satisfies IEcommerceMallAdminRequest.IUpdate,
      },
    );
  typia.assert(approvedRequest);
  // Step 6: Verify admin role is created for the applicant
  TestValidator.notEquals(
    "admin role is created",
    approvedRequest.adminRole,
    null,
  );
  TestValidator.equals(
    "admin role grade is regular",
    approvedRequest.adminRole?.grade,
    "regular",
  );
  // Step 7: Verify request status is 'approved' with approval_notes
  TestValidator.equals(
    "request status is approved",
    approvedRequest.status,
    "approved",
  );
  TestValidator.equals(
    "approval_notes is set",
    approvedRequest.approvalNotes,
    "Approved by super admin",
  );
  // Step 8: Verify super_admin_id and responded_at are set
  TestValidator.notEquals(
    "super admin is set",
    approvedRequest.superAdmin,
    null,
  );
  TestValidator.predicate(
    "responded_at is set",
    () =>
      approvedRequest.respondedAt !== null &&
      approvedRequest.respondedAt !== undefined,
  );
}