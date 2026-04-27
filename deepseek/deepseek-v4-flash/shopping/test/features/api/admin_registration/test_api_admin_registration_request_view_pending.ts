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

/**
 * Test that a customer can retrieve full details of their own pending administrator registration request.
 *
 * Validates the complete flow of creating and viewing an admin registration request. The test
 * covers the pending state verification including that no review has been initiated yet.
 * Special attention is given to verifying the polymorphic requester resolution returns a
 * customer summary with matching identity fields.
 *
 * 1. Customer A registers an account with email and password via the join endpoint.
 * 2. Customer A submits an administrator registration request with a reason text.
 * 3. Customer A retrieves the request by its identifier.
 * 4. Validates status is "pending", requester_type is "customer", reason matches input.
 * 5. Validates reviewer, reviewed_at, and rejection_reason are all null.
 * 6. Validates requester resolves to IECommerceMallCustomer.ISummary with correct id and email.
 * 7. Validates created_at and updated_at are valid ISO date-time strings.
 */
export async function test_api_admin_registration_request_view_pending(
  connection: api.IConnection,
): Promise<void> {
  // Setup
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(customer);
  // Create admin registration request
  const reason = "I want to help manage the platform.";
  const registration =
    await generate_random_e_commerce_mall_customer_admin_registration_requests_create(
      customerConnection,
      {
        body: {
          reason,
        },
      },
    );
  typia.assert(registration);
  // Retrieve the request
  const retrieved =
    await api.functional.eCommerceMall.customer.admin_registration_requests.at(
      customerConnection,
      {
        requestId: registration.id,
      },
    );
  typia.assert(retrieved);
  // Validate pending state fields
  TestValidator.equals("status is pending", retrieved.status, "pending");
  TestValidator.equals("requester type is customer", retrieved.requester_type, "customer");
  TestValidator.equals("reason matches input", retrieved.reason, reason);
  TestValidator.equals("reviewer is null", retrieved.reviewer, null);
  TestValidator.equals("reviewed_at is null", retrieved.reviewed_at, null);
  TestValidator.equals("rejection_reason is null", retrieved.rejection_reason, null);
  TestValidator.equals("deleted_at is null", retrieved.deleted_at, null);
  // Validate polymorphic requester resolution
  TestValidator.equals("requester_type is customer", retrieved.requester_type, "customer");
  const requester = retrieved.requester as IECommerceMallCustomer.ISummary;
  TestValidator.equals("requester id matches", requester.id, customer.id);
  TestValidator.equals("requester email matches", requester.email, customer.email);
  // Validate timestamps
  TestValidator.predicate(
    "created_at is valid date-time",
    () => !isNaN(Date.parse(retrieved.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    () => !isNaN(Date.parse(retrieved.updated_at)),
  );
}
