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

export async function test_api_admin_registration_request_retrieval_by_customer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoined = await authorize_customer_join(customerConnection, {});
  typia.assert(customerJoined);
  // 2. Submit an admin registration request as the customer
  const reason = "I wish to help moderate the platform";
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
  // 3. Register a super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminJoined = await authorize_super_administrator_join(
    superAdminConnection,
    {},
  );
  typia.assert(superAdminJoined);
  // 4. Retrieve the admin registration request details as the super administrator
  const retrieved =
    await api.functional.eCommerceMall.superAdministrator.admin_registration_requests.at(
      superAdminConnection,
      {
        requestId: request.id,
      },
    );
  typia.assert(retrieved);
  // 5. Validate core fields of the retrieved request
  TestValidator.equals("request id matches", retrieved.id, request.id);
  TestValidator.equals(
    "requester_type is customer",
    retrieved.requester_type,
    "customer",
  );
  TestValidator.equals("status is pending", retrieved.status, "pending");
  TestValidator.equals("reason matches", retrieved.reason, reason);
  // 6. Validate the polymorphic requester resolution (customer type) - both id and email are available on both union members
  TestValidator.equals(
    "requester id matches customer",
    retrieved.requester.id,
    customerJoined.id,
  );
  TestValidator.equals(
    "requester email matches customer",
    retrieved.requester.email,
    customerJoined.email,
  );
  // 7. Validate pending request fields are null
  TestValidator.equals("reviewer is null", retrieved.reviewer, null);
  TestValidator.equals("reviewed_at is null", retrieved.reviewed_at, null);
  TestValidator.equals(
    "rejection_reason is null",
    retrieved.rejection_reason,
    null,
  );
  // 8. Validate timestamps exist (format validated by typia.assert above)
  TestValidator.predicate(
    "created_at exists",
    () => retrieved.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at exists",
    () => retrieved.updated_at !== undefined,
  );
}
