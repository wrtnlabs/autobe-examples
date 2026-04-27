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
import { generate_random_e_commerce_mall_customer_admin_registration_requests_create } from "../../../generate/generate_random_e_commerce_mall_customer_admin_registration_requests_create";
import { prepare_random_ecommerce_mall_admin_registration_request } from "../../../prepare/prepare_random_ecommerce_mall_admin_registration_request";

export async function test_api_admin_registration_request_submit_by_customer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {});
  typia.assert(authorized);
  // 2. Submit an administrator registration request with a specific reason
  const reason =
    "I want to help moderate the platform and manage seller approvals";
  const request =
    await generate_random_e_commerce_mall_customer_admin_registration_requests_create(
      customerConnection,
      {
        body: {
          reason,
        },
      },
    );
  typia.assert(request);
  // 3. Validate requester_type is "customer"
  TestValidator.equals("requester_type", request.requester_type, "customer");
  // 4. Validate status is "pending"
  TestValidator.equals("status", request.status, "pending");
  // 5. Validate reason matches the submitted value
  TestValidator.equals("reason", request.reason, reason);
  // 6. Validate rejection_reason is null
  TestValidator.equals("rejection_reason", request.rejection_reason, null);
  // 7. Validate reviewer is null
  TestValidator.equals("reviewer", request.reviewer, null);
  // 8. Validate reviewed_at is null
  TestValidator.equals("reviewed_at", request.reviewed_at, null);
  // 9. Validate requester is a customer summary with matching id and email
  const requester = request.requester;
  typia.assertGuard<IECommerceMallCustomer.ISummary>(requester);
  TestValidator.equals("requester.id", requester.id, authorized.id);
  TestValidator.equals("requester.email", requester.email, authorized.email);
}
