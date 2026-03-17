import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
import type { IEcommerceMallSellerRegistrationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistrationSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerRegistrationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerRegistrationSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_registrations_create } from "../../../generate/generate_random_ecommerce_mall_seller_registrations_create";
import { prepare_random_ecommerce_mall_seller_registration } from "../../../prepare/prepare_random_ecommerce_mall_seller_registration";

export async function test_api_seller_registration_snapshot_audit_trail_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create customer account to submit seller registration
  const customerConnection: api.IConnection = { host: connection.host };
  const customerEmail = `${RandomGenerator.alphaNumeric(8)}@example.com`;
  const customerPassword = "TestPassword123!";
  const customer = await api.functional.ecommerceMall.auth.customer.join(
    customerConnection,
    {
      body: {
        email: customerEmail,
        password: customerPassword,
      } satisfies IEcommerceMallCustomer.IJoin,
    },
  );
  typia.assert(customer);
  // Step 2: Submit seller registration as customer
  const registration =
    await api.functional.ecommerceMall.seller.registrations.create(
      customerConnection,
      {
        body: {
          taxIdentificationNumber: `TIN-${RandomGenerator.alphaNumeric(10)}`,
          businessRegistrationNumber: `BRN-${RandomGenerator.alphaNumeric(10)}`,
          businessName: RandomGenerator.name(),
          businessAddress: RandomGenerator.paragraph({ sentences: 2 }),
          reason: "Test seller registration for audit trail verification",
        } satisfies IEcommerceMallSellerRegistration.ICreate,
      },
    );
  typia.assert(registration);
  // Step 3: Create admin account to review registration
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = `${RandomGenerator.alphaNumeric(8)}@admin.example.com`;
  const adminPassword = "AdminPass123!";
  const admin = await api.functional.ecommerceMall.auth.admin.join(
    adminConnection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
        href: "http://localhost:3000/admin",
        referrer: "http://localhost:3000/",
        ip: "127.0.0.1",
      } satisfies IEcommerceMallAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 4: Admin reviews the registration, creating a snapshot
  const registrationId = (registration as any).id;
  const reviewResult =
    await api.functional.ecommerceMall.admin.sellers.registrations.review(
      adminConnection,
      {
        registrationId: registrationId,
        body: {
          status: "approved",
          rejection_reason: null,
        } satisfies IEcommerceMallSellerRegistration.IReview,
      },
    );
  typia.assert(reviewResult);
  // Step 5: List registration snapshots to obtain a specific snapshot ID
  const snapshotList =
    await api.functional.ecommerceMall.admin.seller.registration_snapshots.index(
      adminConnection,
      {
        body: {
          registrationId: registrationId,
        } satisfies IEcommerceMallSellerRegistrationSnapshot.IRequest,
      },
    );
  typia.assert(snapshotList);
  // Verify at least one snapshot exists
  TestValidator.predicate(
    "at least one snapshot should exist",
    snapshotList.data.length > 0,
  );
  // Get the first snapshot ID
  const snapshotId = snapshotList.data[0].id;
  // Step 6: Admin retrieves specific snapshot by ID
  const snapshot =
    await api.functional.ecommerceMall.admin.seller.registration_snapshots.at(
      adminConnection,
      {
        snapshotId: snapshotId,
      },
    );
  typia.assert(snapshot);
  // Step 7: Verify audit trail details
  TestValidator.equals(
    "snapshot ID matches requested ID",
    snapshot.id,
    snapshotId,
  );
  TestValidator.predicate(
    "snapshot has createdAt timestamp",
    !!snapshot.createdAt,
  );
  TestValidator.equals("snapshot reviewer exists", !!snapshot.reviewer, true);
  TestValidator.equals(
    "snapshot reviewer ID matches admin",
    snapshot.reviewer!.id,
    admin.id,
  );
  TestValidator.equals(
    "snapshot reviewer email matches admin",
    snapshot.reviewer!.email,
    admin.email,
  );
  TestValidator.equals(
    "snapshot registration ID matches",
    (snapshot.registration as any).id,
    registrationId,
  );
}
