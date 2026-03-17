import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_ecommerce_mall_seller_registrations_create } from "../../../generate/generate_random_ecommerce_mall_seller_registrations_create";
import { prepare_random_ecommerce_mall_seller_registration } from "../../../prepare/prepare_random_ecommerce_mall_seller_registration";

/**
 * Test scenario: Successfully approve a pending seller registration
 *
 * Prerequisites:
 * 1. A super administrator must be authenticated via /ecommerceMall/auth/superAdmin/join
 * 2. A seller registration must be created with 'pending' status via /ecommerceMall/seller/registrations
 */
export async function test_api_seller_registration_approval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate as superAdmin
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await api.functional.ecommerceMall.auth.superAdmin.join(
    superAdminConnection,
    {
      body: typia.random<IEcommerceMallSuperAdmin.IJoin>(),
    },
  );
  typia.assert(superAdmin);
  // 2. Create and authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 3. Create seller registration with pending status
  const registration =
    await generate_random_ecommerce_mall_seller_registrations_create(
      sellerConnection,
      {},
    );
  typia.assert(registration);
  // 4. Review and approve the registration (snapshot created automatically by backend)
  const reviewBody = {
    status: "approved" as const,
    rejection_reason: null,
  } satisfies IEcommerceMallSellerRegistration.IReview;
  const approvedRegistration =
    await api.functional.ecommerceMall.superAdmin.sellers.registrations.review(
      superAdminConnection,
      {
        registrationId: (registration as any).id,
        body: reviewBody,
      },
    );
  typia.assert(approvedRegistration);
  // 5. Validate the approval response
  TestValidator.equals(
    "registration status is approved",
    (approvedRegistration as any).status,
    "approved",
  );
  TestValidator.equals(
    "reviewer_id matches superAdmin",
    (approvedRegistration as any).reviewer_id,
    superAdmin.id,
  );
  TestValidator.predicate(
    "reviewed_at timestamp exists",
    () => (approvedRegistration as any).reviewed_at !== null,
  );
  TestValidator.equals(
    "rejection_reason is null",
    (approvedRegistration as any).rejection_reason,
    null,
  );
}
