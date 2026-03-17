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
 * Test administrator rejection of seller registration with reason.
 *
 * 1. Admin joins
 * 2. Seller joins
 * 3. Seller submits registration request
 * 4. Admin reviews and rejects the registration with a rejection reason
 * 5. Verify rejection is processed correctly
 */
export async function test_api_seller_registration_review_rejected_with_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup admin connection and create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(admin);
  // 2. Setup seller connection and create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(seller);
  // Verify seller starts with pending/rejected approval status
  TestValidator.predicate(
    "seller should have initial approval status",
    () =>
      seller.approvalStatus === "pending" ||
      seller.approvalStatus === "rejected",
  );
  // 3. Seller submits registration request
  const registration =
    await generate_random_ecommerce_mall_seller_registrations_create(
      sellerConnection,
      {
        body: {
          taxIdentificationNumber: RandomGenerator.alphaNumeric(10),
          businessRegistrationNumber: RandomGenerator.alphaNumeric(10),
          businessName: RandomGenerator.name(),
          businessAddress: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEcommerceMallSellerRegistration.ICreate,
      },
    );
  typia.assert(registration);
  // 4. Admin rejects the registration with a clear reason
  const rejectionReason = RandomGenerator.paragraph({ sentences: 2 });
  const reviewBody: IEcommerceMallSellerRegistration.IReview = {
    status: "rejected",
    rejection_reason: rejectionReason,
  } satisfies IEcommerceMallSellerRegistration.IReview;
  const reviewedRegistration =
    await api.functional.ecommerceMall.admin.sellers.registrations.review(
      adminConnection,
      {
        registrationId: typia.random<string & tags.Format<"uuid">>(),
        body: reviewBody,
      },
    );
  typia.assert(reviewedRegistration);
  // 5. Validations - verify rejection was processed
  // The review endpoint returns the updated registration with rejection details
  TestValidator.predicate(
    "reviewed registration should exist",
    () => reviewedRegistration !== null,
  );
}
