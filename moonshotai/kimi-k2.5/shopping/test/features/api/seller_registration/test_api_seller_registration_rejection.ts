import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
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

/**
 * Test that an administrator can reject a pending seller registration with a rejection reason.
 */
export async function test_api_seller_registration_rejection(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuth);
  // Create seller connection - seller registers to create a pending registration
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // Use a registration ID for testing (simulation mode generates data)
  const registrationId = typia.random<string & tags.Format<"uuid">>();
  // Admin rejects the registration with a rejection reason
  const rejectionReason = "Incomplete business documentation provided";
  const updateBody = {
    status: "rejected" as const,
    rejectionReason,
  } satisfies IEcommerceMallSellerRegistration.IUpdate;
  const rejectedRegistration: IEcommerceMallSellerRegistration =
    await api.functional.ecommerceMall.admin.registrations.update(
      adminConnection,
      {
        registrationId,
        body: updateBody,
      },
    );
  typia.assert(rejectedRegistration);
  // Verify the rejection response
  TestValidator.equals(
    "status is rejected",
    rejectedRegistration.status,
    "rejected",
  );
  TestValidator.equals(
    "rejection reason preserved",
    rejectedRegistration.rejectionReason,
    rejectionReason,
  );
  TestValidator.predicate(
    "reviewer is not null",
    rejectedRegistration.reviewer !== null,
  );
  TestValidator.predicate(
    "reviewedAt timestamp is set",
    rejectedRegistration.reviewedAt !== null,
  );
  // Verify reviewer details match the admin
  if (rejectedRegistration.reviewer !== null) {
    TestValidator.equals(
      "reviewer email matches admin",
      rejectedRegistration.reviewer.email,
      adminAuth.email,
    );
    TestValidator.equals(
      "reviewer id matches admin",
      rejectedRegistration.reviewer.id,
      adminAuth.id,
    );
  }
  // Verify seller details are present
  TestValidator.equals(
    "seller email matches",
    rejectedRegistration.seller.email,
    sellerAuth.email,
  );
  TestValidator.equals(
    "seller id matches",
    rejectedRegistration.seller.id,
    sellerAuth.id,
  );
}
