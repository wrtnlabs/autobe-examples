import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
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
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_ecommerce_mall_seller_registrations_create } from "../../../generate/generate_random_ecommerce_mall_seller_registrations_create";
import { prepare_random_ecommerce_mall_seller_registration } from "../../../prepare/prepare_random_ecommerce_mall_seller_registration";

/**
 * Test that an administrator can retrieve a rejected seller registration and view the rejection reason.
 *
 * 1. Create super admin account and authenticate
 * 2. Create seller account and authenticate
 * 3. Submit seller registration application
 * 4. Reject the registration with a specific rejection reason by super admin
 * 5. Create admin account and authenticate
 * 6. Retrieve the rejected registration as admin
 * 7. Verify the rejection_reason field contains the expected explanation
 */
export async function test_api_admin_seller_registration_rejected_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await api.functional.ecommerceMall.auth.superAdmin.join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: null,
      } satisfies IEcommerceMallSuperAdmin.IJoin,
    },
  );
  typia.assert(superAdmin);
  // 2. Create and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 3. Submit seller registration
  const registration =
    await generate_random_ecommerce_mall_seller_registrations_create(
      sellerConnection,
      {},
    );
  typia.assert(registration);
  // 4. Reject registration with specific reason
  const rejectionReason = "Invalid business documentation provided";
  const reviewed =
    await api.functional.ecommerceMall.superAdmin.sellers.registrations.review(
      superAdminConnection,
      {
        registrationId: (
          registration as {
            id: string;
          }
        ).id,
        body: {
          status: "rejected",
          rejection_reason: rejectionReason,
        } satisfies IEcommerceMallSellerRegistration.IReview,
      },
    );
  typia.assert(reviewed);
  // 5. Create and authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // 6. Retrieve rejected registration as admin
  const retrieved =
    await api.functional.ecommerceMall.admin.sellers.registrations.at(
      adminConnection,
      {
        sellerId: seller.id,
        registrationId: (
          registration as {
            id: string;
          }
        ).id,
      },
    );
  typia.assert(retrieved);
  // 7. Verify rejection reason is visible
  TestValidator.equals(
    "rejection reason matches provided explanation",
    (
      retrieved as {
        rejection_reason: string | null;
      }
    ).rejection_reason,
    rejectionReason,
  );
}
