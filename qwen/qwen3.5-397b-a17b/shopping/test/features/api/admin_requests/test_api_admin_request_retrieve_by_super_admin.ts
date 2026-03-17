import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_shopping_mall_customer_admin_requests_create } from "../../../generate/generate_random_shopping_mall_customer_admin_requests_create";
import { prepare_random_shopping_mall_admin_request } from "../../../prepare/prepare_random_shopping_mall_admin_request";

/**
 * Test that a super administrator can successfully retrieve any administrator promotion request for review purposes.
 *
 * This test validates the super admin review workflow by:
 * 1. Creating a customer account
 * 2. Submitting an admin promotion request with a valid reason
 * 3. Creating and authenticating as a super administrator
 * 4. Retrieving the admin request using its ID
 * 5. Validating all response fields including customer information and request status
 */
export async function test_api_admin_request_retrieve_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account who will submit admin promotion request
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Submit admin promotion request with valid reason
  const adminRequest =
    await api.functional.shoppingMall.customer.admin_requests.create(
      customerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IShoppingMallAdminRequest.ICreate,
      },
    );
  typia.assert(adminRequest);
  // 3. Create and authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // 4. Retrieve the admin request using super admin connection
  const retrievedRequest =
    await api.functional.shoppingMall.admin.admin_requests.at(
      superAdminConnection,
      {
        requestId: adminRequest.id,
      },
    );
  typia.assert(retrievedRequest);
  // 5. Validate response contains complete request details
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
  TestValidator.equals("status is PENDING", retrievedRequest.status, "PENDING");
  TestValidator.equals(
    "responded_at is null for pending",
    retrievedRequest.responded_at,
    null,
  );
  TestValidator.equals(
    "respondedBySuperAdmin is null for pending",
    retrievedRequest.respondedBySuperAdmin,
    null,
  );
  // Validate customer information matches
  TestValidator.equals(
    "customer ID matches",
    retrievedRequest.customer.id,
    customer.id,
  );
  TestValidator.equals(
    "customer email matches",
    retrievedRequest.customer.email,
    customer.email,
  );
  TestValidator.equals(
    "customer nickname matches",
    retrievedRequest.customer.nickname,
    customer.nickname,
  );
  TestValidator.equals(
    "customer phone matches",
    retrievedRequest.customer.phone_number,
    customer.phone_number,
  );
  // Validate timestamps are properly formatted
  TestValidator.predicate("requested_at is valid date-time", () => {
    const date = new Date(retrievedRequest.requested_at);
    return !isNaN(date.getTime());
  });
  TestValidator.predicate("created_at is valid date-time", () => {
    const date = new Date(retrievedRequest.created_at);
    return !isNaN(date.getTime());
  });
}
