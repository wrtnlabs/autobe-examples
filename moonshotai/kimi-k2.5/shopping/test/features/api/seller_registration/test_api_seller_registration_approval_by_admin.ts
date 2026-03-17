import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
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
import { generate_random_ecommerce_mall_seller_registrations_create } from "../../../generate/generate_random_ecommerce_mall_seller_registrations_create";
import { prepare_random_ecommerce_mall_seller_registration } from "../../../prepare/prepare_random_ecommerce_mall_seller_registration";

/**
 * Test seller registration approval by administrator workflow.
 *
 * Scenario: A seller registers and submits a business registration application,
 * then an administrator reviews and approves the application.
 *
 * 1. Seller authenticates via /auth/seller/join
 * 2. Seller creates a pending registration via POST /ecommerceMall/seller/registrations
 * 3. Administrator authenticates via /auth/admin/join
 * 4. Administrator calls PUT to update registration status to 'approved'
 * 5. Verify the response contains status 'approved', reviewer_id is admin's ID,
 *    reviewed_at timestamp is populated, and seller relationship is included
 */
export async function test_api_seller_registration_approval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup - create seller account and pending registration
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {},
  });
  typia.assert(seller);
  const registration =
    await generate_random_ecommerce_mall_seller_registrations_create(
      sellerConnection,
      { body: {} },
    );
  typia.assert(registration);
  // 2. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {},
  });
  typia.assert(admin);
  // 3. Admin approves the seller registration
  const approvedRegistration =
    await api.functional.ecommerceMall.admin.seller_registrations.update(
      adminConnection,
      {
        registrationId: (registration as any).id,
        body: {
          status: "approved",
          rejection_reason: null,
        } satisfies IEcommerceMallSellerRegistration.IUpdate,
      },
    );
  typia.assert(approvedRegistration);
  // 4. Business logic validations
  TestValidator.equals(
    "registration status is approved",
    (approvedRegistration as any).status,
    "approved",
  );
  TestValidator.equals(
    "reviewer_id matches admin id",
    (approvedRegistration as any).reviewer_id,
    admin.id,
  );
  TestValidator.predicate(
    "reviewed_at timestamp exists",
    () => (approvedRegistration as any).reviewed_at !== null,
  );
  TestValidator.predicate(
    "seller relationship is included",
    () => (approvedRegistration as any).seller !== undefined,
  );
}
