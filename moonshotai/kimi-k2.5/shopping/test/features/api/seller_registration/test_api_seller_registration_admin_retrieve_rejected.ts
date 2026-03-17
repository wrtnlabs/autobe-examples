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

export async function test_api_seller_registration_admin_retrieve_rejected(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuth);
  // Create seller connection and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // Submit seller registration to create pending registration
  const registration =
    await generate_random_ecommerce_mall_seller_registrations_create(
      sellerConnection,
      {},
    );
  typia.assert(registration);
  // Extract registration ID from created registration
  const registrationId = (registration as any).id;
  // Admin rejects the registration with specific reason
  const rejectionReason =
    "Business registration documents are invalid or incomplete";
  const rejectedRegistration =
    await api.functional.ecommerceMall.admin.sellers.registrations.review(
      adminConnection,
      {
        registrationId: registrationId as string & tags.Format<"uuid">,
        body: {
          status: "rejected",
          rejection_reason: rejectionReason,
        } satisfies IEcommerceMallSellerRegistration.IReview,
      },
    );
  typia.assert(rejectedRegistration);
  // Retrieve the rejected registration
  const retrievedRegistration =
    await api.functional.ecommerceMall.admin.registrations.at(adminConnection, {
      registrationId: registrationId as string,
    });
  typia.assert(retrievedRegistration);
  // Verify rejection details are present in retrieved registration
  TestValidator.equals(
    "status is REJECTED",
    (retrievedRegistration as any).status,
    "rejected",
  );
  TestValidator.equals(
    "rejectionReason matches admin input",
    (retrievedRegistration as any).rejectionReason,
    rejectionReason,
  );
  TestValidator.predicate(
    "reviewedAt timestamp is present",
    () =>
      (retrievedRegistration as any).reviewedAt !== null &&
      (retrievedRegistration as any).reviewedAt !== undefined,
  );
  TestValidator.equals(
    "reviewerId matches admin who rejected",
    (retrievedRegistration as any).reviewerId,
    adminAuth.id,
  );
}
