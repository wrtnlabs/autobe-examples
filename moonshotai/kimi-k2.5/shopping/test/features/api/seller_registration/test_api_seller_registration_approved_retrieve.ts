import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test approved seller registration retrieval.
 * 1. Seller registers (creates pending registration)
 * 2. Admin approves the registration
 * 3. Seller retrieves the registration to verify approval status
 */
export async function test_api_seller_registration_approved_retrieve(
  connection: api.IConnection,
): Promise<void> {
  // Create seller and get registration
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(seller);

  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(admin);

  // First, seller must retrieve their registration to get the registrationId
  // Since seller join creates a registration, we need to look it up
  // However, the API doesn't have a list endpoint for seller's own registrations
  // We may need to create a registration first or use the seller ID as registration ID
  // Looking at the DTO: IEcommerceMallSellerRegistration has seller field with ISummary
  //
  // Per the scenario: we need to have a registrationId. Since the seller just joined,
  // the system created a registration. We need to know its ID.
  // For this test, we'll create the registration via separate API if needed,
  // or we assume the registration ID equals seller ID (based on typical implementations)
  // Actually, looking at the SDK: we have seller.registrations.at which takes registrationId
  //
  // The issue: after seller join, we don't have the registrationId directly.
  // We need to either:
  // 1. Have a separate endpoint to list seller's registrations
  // 2. Create a registration explicitly
  // 3. Make an assumption about ID mapping
  //
  // Based on typical e-commerce mall patterns, seller registration is created during join.
  // The registrationId is typically the same as sellerId or we need to query it.
  // Since no query endpoint exists in provided SDK, we'll use seller.id as registrationId
  // (adjusting based on actual server behavior).
  const registrationId = seller.id;

  // Admin approves the registration
  const approved = await api.functional.ecommerceMall.admin.registrations.update(
    adminConnection,
    {
      registrationId,
      body: {
        status: "approved",
        rejectionReason: null,
      } satisfies IEcommerceMallSellerRegistration.IUpdate,
    },
  );
  typia.assert(approved);

  // Seller retrieves their approved registration
  const retrieved = await api.functional.ecommerceMall.seller.registrations.at(
    sellerConnection,
    { registrationId },
  );
  typia.assert(retrieved);

  // Business logic validations (not type validations)
  TestValidator.equals("registration status", retrieved.status, "approved");
  TestValidator.equals("seller matches", retrieved.seller.id, seller.id);
  TestValidator.predicate("reviewer exists", retrieved.reviewer !== null);
  TestValidator.equals("reviewer is the approving admin", retrieved.reviewer!.id, admin.id);
  TestValidator.equals("rejectionReason is null for approved", retrieved.rejectionReason, null);
}