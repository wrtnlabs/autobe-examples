import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerAdminRequest";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_sellers_me_admin_requests_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_admin_requests_create";
import { prepare_random_ecommerce_mall_seller_admin_request } from "../../../prepare/prepare_random_ecommerce_mall_seller_admin_request";

/**
 * Test duplicate admin request submission prevention.
 *
 * Validates that the system properly enforces unique admin request per seller by
 * preventing duplicate submissions. When a seller already has a pending or approved
 * admin request, attempting to submit another request should return a 409 Conflict
 * error.
 *
 * 1. Administrator registers and authenticates on the platform.
 * 2. Seller registers a new account with unique credentials.
 * 3. Administrator approves the seller registration, changing status from pending to approved.
 * 4. Seller authenticates with approved credentials.
 * 5. First admin request submitted with 'First admin request' reason - should succeed with pending status.
 * 6. Second admin request submitted with 'Duplicate admin request' reason - should fail with 409 Conflict.
 *
 * This test ensures the business rule that each seller can only have one non-deleted
 * admin request at a time is properly enforced at the API level.
 */
export async function test_api_seller_admin_request_duplicate_submission(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Register a new seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  // 3. Admin approves the seller
  const approvedSeller =
    await api.functional.ecommerceMall.admin.admin.sellers.approve(
      adminConnection,
      { sellerId: sellerAuth.id },
    );
  typia.assert(approvedSeller);
  // 4. Seller authenticates with approved account
  const loggedInSellerConnection: api.IConnection = { host: connection.host };
  const loggedInSeller = await authorize_seller_login(
    loggedInSellerConnection,
    {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(loggedInSeller);
  // 5. First admin request - should succeed
  const firstRequest =
    await api.functional.ecommerceMall.seller.sellers.me.admin_requests.create(
      loggedInSellerConnection,
      {
        body: {
          reason: "First admin request",
        } satisfies IEcommerceMallSellerAdminRequest.ICreate,
      },
    );
  typia.assert(firstRequest);
  // 6. Validate first request has pending status
  TestValidator.equals("first request status", firstRequest.status, "pending");
  TestValidator.equals(
    "first request reason",
    firstRequest.reason,
    "First admin request",
  );
  // 7. Second admin request - should fail with 409 Conflict
  await TestValidator.error(
    "duplicate admin request should return 409 Conflict",
    async () => {
      await api.functional.ecommerceMall.seller.sellers.me.admin_requests.create(
        loggedInSellerConnection,
        {
          body: {
            reason: "Duplicate admin request",
          } satisfies IEcommerceMallSellerAdminRequest.ICreate,
        },
      );
    },
  );
}
