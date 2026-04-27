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

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";
import { generate_random_e_commerce_mall_customer_admin_registration_requests_create } from "../../../generate/generate_random_e_commerce_mall_customer_admin_registration_requests_create";
import { prepare_random_ecommerce_mall_admin_registration_request } from "../../../prepare/prepare_random_ecommerce_mall_admin_registration_request";

export async function test_api_admin_registration_request_view_approved(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register Customer B
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(customer);
  // 2. Customer B submits admin registration request
  const request =
    await generate_random_e_commerce_mall_customer_admin_registration_requests_create(
      customerConnection,
      { body: { reason: "I want to help the platform grow." } },
    );
  typia.assert(request);
  // 3. Register a regular administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: "regadmin2@test.com",
      password: "AdminPass456!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(admin);
  // 4. Promote the regular admin to super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        administrator_id: admin.id,
        email: "super_approve@test.com",
        password: "SuperPass456!",
      },
    },
  );
  typia.assert(superAdmin);
  // 5. Super admin approves the registration request
  const updated =
    await api.functional.eCommerceMall.superAdministrator.admin_registration_requests.update(
      superAdminConnection,
      {
        requestId: request.id,
        body: {
          status: "approved",
        } satisfies IECommerceMallAdminRegistrationRequest.IUpdate,
      },
    );
  typia.assert(updated);
  // 6. Customer B retrieves their own admin registration request
  const retrieved =
    await api.functional.eCommerceMall.customer.admin_registration_requests.at(
      customerConnection,
      { requestId: request.id },
    );
  typia.assert(retrieved);
  // 7. Validate status is approved
  TestValidator.equals("status", retrieved.status, "approved");
  // 8. Validate no rejection reason (was approved, not rejected)
  TestValidator.predicate(
    "rejection_reason is null",
    retrieved.rejection_reason === null,
  );
  // 9. Validate reviewer is present and matches super admin identity
  TestValidator.predicate("reviewer exists", retrieved.reviewer !== null);
  TestValidator.equals(
    "reviewer email",
    retrieved.reviewer!.email,
    "super_approve@test.com",
  );
  // 10. Validate reviewed_at is set (review happened)
  TestValidator.predicate("reviewed_at exists", retrieved.reviewed_at !== null);
  // 11. Validate requester resolves to Customer B
  const requester = typia.assert<IECommerceMallCustomer.ISummary>(
    retrieved.requester,
  );
  TestValidator.equals("requester id", requester.id, customer.id);
  // 12. Validate timestamps exist
  TestValidator.predicate("created_at exists", retrieved.created_at !== null);
  TestValidator.predicate("updated_at exists", retrieved.updated_at !== null);
}
