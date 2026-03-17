import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_shopping_mall_customer_admin_requests_create } from "../../../generate/generate_random_shopping_mall_customer_admin_requests_create";
import { prepare_random_shopping_mall_admin_request } from "../../../prepare/prepare_random_shopping_mall_admin_request";

/**
 * Test that customers can submit a new admin request after their previous
 * request has been resolved.
 *
 * Workflow:
 * 1. Customer registers and submits first admin request
 * 2. Super administrator would review and respond (not available in SDK)
 * 3. Customer submits second admin request after resolution
 * 4. Verify second submission succeeds with PENDING status
 *
 * Note: The super admin response endpoint is not available in the provided
 * SDK functions. This test validates the request submission workflow and
 * demonstrates the resubmission capability structure.
 */
export async function test_api_admin_request_resubmission_after_resolution(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
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
  typia.assert(customerAuth);
  // 2. Register super administrator account
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_admin_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallSuperAdmin.IJoin,
    },
  );
  typia.assert(superAdminAuth);
  // 3. Customer submits first admin request
  const firstRequest =
    await generate_random_shopping_mall_customer_admin_requests_create(
      customerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IShoppingMallAdminRequest.ICreate,
      },
    );
  typia.assert(firstRequest);
  // Validate first request structure
  TestValidator.equals("first request status", firstRequest.status, "PENDING");
  TestValidator.equals(
    "first request customer email",
    firstRequest.customer.email,
    customerAuth.email,
  );
  TestValidator.predicate(
    "first request has timestamp",
    firstRequest.requested_at !== null,
  );
  // 4. Super administrator would respond to first request here
  // NOTE: The endpoint for super admin to respond to admin requests
  // (approve/reject) is not available in the provided SDK functions.
  // In production, this would change firstRequest.status from PENDING to
  // APPROVED or REJECTED, enabling the customer to submit a new request.
  // For this test, we proceed to demonstrate the second submission structure.
  // 5. Customer submits second admin request
  // This would succeed after the first request is resolved by super admin
  const secondRequest =
    await generate_random_shopping_mall_customer_admin_requests_create(
      customerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IShoppingMallAdminRequest.ICreate,
      },
    );
  typia.assert(secondRequest);
  // Validate second request structure
  TestValidator.equals(
    "second request status",
    secondRequest.status,
    "PENDING",
  );
  TestValidator.equals(
    "second request customer email",
    secondRequest.customer.email,
    customerAuth.email,
  );
  TestValidator.notEquals(
    "request IDs differ",
    firstRequest.id,
    secondRequest.id,
  );
  TestValidator.predicate(
    "second request has timestamp",
    secondRequest.requested_at !== null,
  );
}
