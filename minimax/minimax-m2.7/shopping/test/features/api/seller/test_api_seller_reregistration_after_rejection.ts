import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
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
import { generate_random_ecommerce_mall_seller_seller_reregister } from "../../../generate/generate_random_ecommerce_mall_seller_seller_reregister";
import { prepare_random_ecommerce_mall_seller } from "../../../prepare/prepare_random_ecommerce_mall_seller";

/**
 * Test seller reregistration workflow for rejected sellers.
 *
 * Validates the complete reregistration flow where a seller whose initial registration
 * was rejected can resubmit their application. This test ensures that:
 *
 * - A rejected seller can authenticate with their existing credentials
 * - The reregistration endpoint accepts valid credentials and resets approval_status to 'pending'
 * - New JWT tokens are issued upon successful reregistration
 * - The seller's account information (id, email, timestamps) is preserved
 * - The seller re-enters the standard approval workflow after reregistration
 *
 * 1. Create admin account for seller rejection
 * 2. Create seller account (status becomes 'pending')
 * 3. Admin rejects the seller (status changes to 'rejected')
 * 4. Rejected seller calls reregistration endpoint with credentials
 * 5. Validate response contains 'pending' status and valid tokens
 */
export async function test_api_seller_reregistration_after_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account for seller rejection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminJoinResult = await api.functional.ecommerceMall.auth.admin.join(
    adminConnection,
    {
      body: {
        email: adminEmail,
        password: adminPassword satisfies string &
          tags.MinLength<8> &
          tags.Format<"password">,
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallAdmin.IJoin,
    },
  );
  typia.assert(adminJoinResult);
  // 2. Create seller account (status becomes 'pending')
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerJoinResult = await api.functional.ecommerceMall.auth.seller.join(
    sellerConnection,
    {
      body: {
        email: sellerEmail,
        password: sellerPassword satisfies string &
          tags.MinLength<8> &
          tags.Format<"password">,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallSeller.IJoin,
    },
  );
  typia.assert(sellerJoinResult);
  // 3. Admin rejects the seller (authenticate with admin's own credentials)
  const adminRejectConnection: api.IConnection = { host: connection.host };
  await api.functional.ecommerceMall.auth.admin.login(adminRejectConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  const rejectResult =
    await api.functional.ecommerceMall.admin.admin.sellers.reject(
      adminRejectConnection,
      {
        sellerId: sellerJoinResult.id,
        body: {
          rejectionReason:
            "Application does not meet our seller requirements at this time.",
        } satisfies IEcommerceMallSeller.IUpdate,
      },
    );
  typia.assert(rejectResult);
  // Verify seller is now rejected
  TestValidator.equals(
    "seller status is rejected",
    rejectResult.approvalStatus,
    "rejected",
  );
  // 4. Rejected seller calls reregistration endpoint
  const reregisterConnection: api.IConnection = { host: connection.host };
  const reregisterResponse =
    await api.functional.ecommerceMall.seller.seller.reregister(
      reregisterConnection,
      {
        body: {
          email: sellerEmail,
          password: sellerPassword,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IEcommerceMallSeller.ICreate,
      },
    );
  typia.assert(reregisterResponse);
  // 5. Validate reregistration response
  TestValidator.equals(
    "approval status is pending",
    reregisterResponse.approvalStatus,
    "pending",
  );
  TestValidator.predicate(
    "access token is valid",
    reregisterResponse.accessToken.length > 0,
  );
  TestValidator.predicate(
    "refresh token is valid",
    reregisterResponse.refreshToken.length > 0,
  );
  TestValidator.equals(
    "email matches original",
    reregisterResponse.email,
    sellerEmail,
  );
  TestValidator.equals(
    "id is preserved",
    reregisterResponse.id,
    sellerJoinResult.id,
  );
  TestValidator.predicate(
    "created_at exists",
    reregisterResponse.createdAt !== undefined &&
      reregisterResponse.createdAt !== null,
  );
  TestValidator.predicate(
    "updated_at exists",
    reregisterResponse.updatedAt !== undefined &&
      reregisterResponse.updatedAt !== null,
  );
  TestValidator.predicate(
    "expired_at exists",
    reregisterResponse.expiredAt !== undefined &&
      reregisterResponse.expiredAt !== null,
  );
}
