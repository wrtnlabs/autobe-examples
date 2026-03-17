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
 * Test retrieving a rejected seller registration to verify rejection details are included.
 *
 * This test validates that administrators can view complete review history including
 * rejection reasons. The workflow:
 * 1. Create a super administrator account
 * 2. Create a seller account
 * 3. Submit a seller registration (pending state)
 * 4. Review and reject the registration with a reason
 * 5. Retrieve the rejected registration via GET endpoint
 * 6. Verify the response contains rejection details
 */
export async function test_api_seller_registration_retrieve_rejected(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create super administrator (using SDK since no utility function exists for join)
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await api.functional.ecommerceMall.auth.superAdmin.join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
      } satisfies IEcommerceMallSuperAdmin.IJoin,
    },
  );
  typia.assert(superAdmin);
  // Step 2: Create seller account using utility function
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // Step 3: Create seller registration using utility function
  const registration =
    await generate_random_ecommerce_mall_seller_registrations_create(
      sellerConnection,
      {},
    );
  typia.assert(registration);
  // Step 4: Review and reject the registration using super admin connection
  const rejectionReason =
    "Business registration appears fraudulent and documentation is incomplete";
  const rejectedRegistration =
    await api.functional.ecommerceMall.superAdmin.sellers.registrations.review(
      superAdminConnection,
      {
        registrationId: (registration as any).id,
        body: {
          status: "rejected",
          rejection_reason: rejectionReason,
        } satisfies IEcommerceMallSellerRegistration.IReview,
      },
    );
  typia.assert(rejectedRegistration);
  // Step 5: Retrieve the rejected registration using the target GET endpoint
  const retrievedRegistration =
    await api.functional.ecommerceMall.superAdmin.seller_registrations.at(
      superAdminConnection,
      {
        registrationId: (registration as any).id,
      },
    );
  typia.assert(retrievedRegistration);
  // Step 6: Validate rejection details are present
  // Note: Casting to any to access properties not defined in the empty DTO type
  const result = retrievedRegistration as any;
  TestValidator.equals("status is rejected", result.status, "rejected");
  TestValidator.predicate(
    "reviewer_id is not null",
    result.reviewer_id !== null && result.reviewer_id !== undefined,
  );
  TestValidator.predicate(
    "rejection_reason is not null",
    result.rejection_reason !== null && result.rejection_reason !== undefined,
  );
  TestValidator.equals(
    "rejection_reason matches",
    result.rejection_reason,
    rejectionReason,
  );
  TestValidator.predicate(
    "reviewed_at is not null",
    result.reviewed_at !== null && result.reviewed_at !== undefined,
  );
}
