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

export async function test_api_admin_registration_request_duplicate_pending_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized: IECommerceMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {});
  typia.assert(authorized);
  // 2. Submit the first admin registration request
  const firstRequest: IECommerceMallAdminRegistrationRequest =
    await generate_random_e_commerce_mall_customer_admin_registration_requests_create(
      customerConnection,
      {
        body: {
          reason: "I want to help manage the platform",
        },
      },
    );
  typia.assert(firstRequest);
  TestValidator.equals("status is pending", firstRequest.status, "pending");
  TestValidator.predicate(
    "requester_type is customer",
    firstRequest.requester_type === "customer",
  );
  TestValidator.equals(
    "reason matches input",
    firstRequest.reason,
    "I want to help manage the platform",
  );
  TestValidator.predicate(
    "reviewer is null for pending request",
    firstRequest.reviewer === null,
  );
  TestValidator.predicate(
    "reviewed_at is null for pending request",
    firstRequest.reviewed_at === null,
  );
  TestValidator.predicate(
    "rejection_reason is null for pending request",
    firstRequest.rejection_reason === null,
  );
  // 3. Attempt to submit a second request while first is pending
  await TestValidator.httpError(
    "duplicate pending admin registration request rejected with 409",
    409,
    async () => {
      await generate_random_e_commerce_mall_customer_admin_registration_requests_create(
        customerConnection,
        {
          body: {
            reason: "I can assist with category management",
          },
        },
      );
    },
  );
}
