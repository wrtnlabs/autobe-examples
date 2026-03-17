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

export async function test_api_seller_registration_get_rejected(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create and authenticate as a seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // Step 2: Create a seller registration
  const registration =
    await generate_random_ecommerce_mall_seller_registrations_create(
      sellerConnection,
      {},
    );
  typia.assert(registration);
  // Step 3: Create and authenticate as admin to reject the registration
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // Step 4: Reject the registration as admin with a reason
  const rejectionReason =
    "Business documentation incomplete. Please provide valid tax documents.";
  const rejectedRegistration =
    await api.functional.ecommerceMall.admin.seller_registrations.update(
      adminConnection,
      {
        registrationId: (registration as any).id,
        body: {
          status: "rejected",
          rejection_reason: rejectionReason,
        } satisfies IEcommerceMallSellerRegistration.IUpdate,
      },
    );
  typia.assert(rejectedRegistration);
  // Step 5: Retrieve the registration as seller and verify rejection details
  const retrievedRegistration =
    await api.functional.ecommerceMall.seller.seller_registrations.at(
      sellerConnection,
      {
        registrationId: (registration as any).id,
      },
    );
  typia.assert(retrievedRegistration);
  // Verify: status is 'rejected'
  TestValidator.equals(
    "registration status is rejected",
    (retrievedRegistration as any).status,
    "rejected",
  );
  // Verify: reviewer_id references the rejecting administrator
  TestValidator.equals(
    "reviewer_id matches admin id",
    (retrievedRegistration as any).reviewer_id,
    admin.id,
  );
  // Verify: reviewed_at timestamp is present
  TestValidator.predicate(
    "reviewed_at timestamp is present",
    (retrievedRegistration as any).reviewed_at !== null &&
      (retrievedRegistration as any).reviewed_at !== undefined,
  );
  // Verify: rejection_reason contains the administrator-provided explanation
  TestValidator.equals(
    "rejection_reason matches",
    (retrievedRegistration as any).rejection_reason,
    rejectionReason,
  );
}
