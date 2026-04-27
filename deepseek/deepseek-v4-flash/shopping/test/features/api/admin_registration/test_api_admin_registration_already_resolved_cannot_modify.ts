import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdminRegistrationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdminRegistrationRequest";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import type { IECommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";
import { generate_random_e_commerce_mall_customer_admin_registration_requests_create } from "../../../generate/generate_random_e_commerce_mall_customer_admin_registration_requests_create";
import { prepare_random_ecommerce_mall_admin_registration_request } from "../../../prepare/prepare_random_ecommerce_mall_admin_registration_request";

export async function test_api_admin_registration_already_resolved_cannot_modify(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // 2. Customer submits an admin registration request
  const request =
    await generate_random_e_commerce_mall_customer_admin_registration_requests_create(
      customerConnection,
      {},
    );
  typia.assert(request);
  TestValidator.equals("status is pending", request.status, "pending");
  // 3. Authenticate as a super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {},
  );
  typia.assert(superAdmin);
  // 4. Super admin approves the pending request — should succeed
  const approvedRequest =
    await api.functional.eCommerceMall.superAdministrator.admin_registration_requests.update(
      superAdminConnection,
      {
        requestId: request.id,
        body: {
          status: "approved" as const,
        } satisfies IECommerceMallAdminRegistrationRequest.IUpdate,
      },
    );
  typia.assert(approvedRequest);
  TestValidator.equals("approved status", approvedRequest.status, "approved");
  TestValidator.predicate("has reviewer", approvedRequest.reviewer !== null);
  TestValidator.predicate(
    "has reviewed_at",
    approvedRequest.reviewed_at !== null,
  );
  // Record original values for later verification
  const originalReviewerId: string = approvedRequest.reviewer!.id;
  const originalReviewedAt: string = approvedRequest.reviewed_at!;
  // 5. Attempt to modify the already-resolved request — must fail with 422
  await TestValidator.httpError(
    "already resolved cannot be modified",
    422,
    async () => {
      await api.functional.eCommerceMall.superAdministrator.admin_registration_requests.update(
        superAdminConnection,
        {
          requestId: request.id,
          body: {
            status: "rejected" as const,
            rejectionReason: "Changed my mind",
          } satisfies IECommerceMallAdminRegistrationRequest.IUpdate,
        },
      );
    },
  );
}
