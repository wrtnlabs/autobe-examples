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
import { generate_random_ecommerce_mall_admin_admin_sellers_suspend } from "../../../generate/generate_random_ecommerce_mall_admin_admin_sellers_suspend";
import { generate_random_ecommerce_mall_seller_sellers_me_admin_requests_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_admin_requests_create";
import { prepare_random_ecommerce_mall_seller_admin_request } from "../../../prepare/prepare_random_ecommerce_mall_seller_admin_request";
import { prepare_random_ecommerce_mall_seller_suspension } from "../../../prepare/prepare_random_ecommerce_mall_seller_suspension";

/**
 * Test that a suspended seller cannot submit administrative privilege requests.
 *
 * Validates that the system properly enforces seller standing checks before processing
 * administrative operations. When an administrator suspends a seller account, the
 * suspended seller loses the ability to submit admin privilege requests, returning
 * a 403 Forbidden error. This ensures suspended accounts cannot perform elevated
 * operations on the platform.
 *
 * 1. Administrator registers and authenticates on the platform.
 * 2. New seller registers with valid email and password credentials.
 * 3. Administrator approves the seller registration, granting approved status.
 * 4. Seller authenticates with approved credentials.
 * 5. Administrator suspends the seller account with policy violation reason.
 * 6. Attempt to submit admin request as suspended seller.
 * 7. Validates response returns 403 Forbidden error indicating seller account is suspended.
 */
export async function test_api_seller_admin_request_suspended_seller_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // 2. Register a new seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerConnectionForJoin: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnectionForJoin, {
    body: {
      email: sellerEmail,
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(seller);
  // 3. Admin approves the seller
  const approvedSeller =
    await api.functional.ecommerceMall.admin.admin.sellers.approve(
      adminConnection,
      {
        sellerId: seller.id,
      },
    );
  typia.assert(approvedSeller);
  // 4. Seller authenticates with approved credentials
  const sellerConnection: api.IConnection = { host: connection.host };
  const loggedInSeller = await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(loggedInSeller);
  // 5. Admin suspends the seller
  await api.functional.ecommerceMall.admin.admin.sellers.suspend(
    adminConnection,
    {
      sellerId: seller.id,
      body: {
        reason: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IEcommerceMallSellerSuspension.ICreate,
    },
  );
  // 6. Attempt to submit admin request as suspended seller - should fail
  await TestValidator.error(
    "suspended seller cannot submit admin request",
    async () => {
      await api.functional.ecommerceMall.seller.sellers.me.admin_requests.create(
        sellerConnection,
        {
          body: {
            reason: "Request from suspended seller",
          } satisfies IEcommerceMallSellerAdminRequest.ICreate,
        },
      );
    },
  );
}
