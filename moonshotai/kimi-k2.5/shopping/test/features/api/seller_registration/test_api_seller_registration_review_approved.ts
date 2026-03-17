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
 * Test successful seller registration approval workflow.
 *
 * 1. Admin joins and authenticates
 * 2. Seller joins and submits registration request (auto-creates pending registration)
 * 3. Admin reviews the registration with status 'approved'
 * 4. Verifies:
 *    - Registration status changes to 'approved'
 *    - reviewer_id is set to the admin's ID
 *    - rejection_reason is null for approved registrations
 *    - Response passes type validation
 */
export async function test_api_seller_registration_review_approved(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create and authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // Step 2: Create and authenticate seller, then submit registration
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // Step 3: Seller submits registration request
  const registration =
    await generate_random_ecommerce_mall_seller_registrations_create(
      sellerConnection,
      {},
    );
  typia.assert(registration);
  // Extract registration ID (cast needed due to empty base DTO type)
  const registrationId = (registration as any).id as string &
    tags.Format<"uuid">;
  // Step 4: Admin reviews the registration with approved status
  const reviewBody = {
    status: "approved" as const,
    rejection_reason: null,
  } satisfies IEcommerceMallSellerRegistration.IReview;
  const reviewedRegistration =
    await api.functional.ecommerceMall.admin.sellers.registrations.review(
      adminConnection,
      {
        registrationId,
        body: reviewBody,
      },
    );
  typia.assert(reviewedRegistration);
  // Step 5: Validate the approval outcome
  const result = reviewedRegistration as any;
  TestValidator.equals(
    "registration status changed to approved",
    result.status,
    "approved",
  );
  TestValidator.equals(
    "reviewer_id matches admin ID",
    result.reviewer_id,
    admin.id,
  );
  TestValidator.equals(
    "rejection_reason is null for approved registration",
    result.rejection_reason,
    null,
  );
  TestValidator.predicate("reviewed_at timestamp exists", !!result.reviewed_at);
}
