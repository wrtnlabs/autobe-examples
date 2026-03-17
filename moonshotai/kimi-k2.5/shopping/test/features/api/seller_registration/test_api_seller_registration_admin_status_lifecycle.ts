import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerRegistration";
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

export async function test_api_seller_registration_admin_status_lifecycle(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuth);
  // 2. Create three sellers with registrations
  // Seller 1 - will remain pending
  const seller1Connection: api.IConnection = { host: connection.host };
  await authorize_seller_join(seller1Connection, {});
  const registration1 =
    await api.functional.ecommerceMall.seller.registrations.create(
      seller1Connection,
      {
        body: {
          taxIdentificationNumber: RandomGenerator.alphaNumeric(10),
          businessRegistrationNumber: RandomGenerator.alphaNumeric(12),
          businessName: RandomGenerator.name(),
          businessAddress: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEcommerceMallSellerRegistration.ICreate,
      },
    );
  typia.assert(registration1);
  // Seller 2 - will be approved
  const seller2Connection: api.IConnection = { host: connection.host };
  await authorize_seller_join(seller2Connection, {});
  const registration2 =
    await api.functional.ecommerceMall.seller.registrations.create(
      seller2Connection,
      {
        body: {
          taxIdentificationNumber: RandomGenerator.alphaNumeric(10),
          businessRegistrationNumber: RandomGenerator.alphaNumeric(12),
          businessName: RandomGenerator.name(),
          businessAddress: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEcommerceMallSellerRegistration.ICreate,
      },
    );
  typia.assert(registration2);
  // Seller 3 - will be rejected
  const seller3Connection: api.IConnection = { host: connection.host };
  await authorize_seller_join(seller3Connection, {});
  const registration3 =
    await api.functional.ecommerceMall.seller.registrations.create(
      seller3Connection,
      {
        body: {
          taxIdentificationNumber: RandomGenerator.alphaNumeric(10),
          businessRegistrationNumber: RandomGenerator.alphaNumeric(12),
          businessName: RandomGenerator.name(),
          businessAddress: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEcommerceMallSellerRegistration.ICreate,
      },
    );
  typia.assert(registration3);
  // Get registration IDs from the created registrations
  const registration1Id = (registration1 as any).id as string;
  const registration2Id = (registration2 as any).id as string;
  const registration3Id = (registration3 as any).id as string;
  // 3. Approve registration 2
  const approvedRegistration =
    await api.functional.ecommerceMall.admin.seller_registrations.update(
      adminConnection,
      {
        registrationId: registration2Id,
        body: {
          status: "approved",
          rejection_reason: null,
        } satisfies IEcommerceMallSellerRegistration.IUpdate,
      },
    );
  typia.assert(approvedRegistration);
  // 4. Reject registration 3 with reason
  const rejectionReason = "Business documentation incomplete";
  const rejectedRegistration =
    await api.functional.ecommerceMall.admin.seller_registrations.update(
      adminConnection,
      {
        registrationId: registration3Id,
        body: {
          status: "rejected",
          rejection_reason: rejectionReason,
        } satisfies IEcommerceMallSellerRegistration.IUpdate,
      },
    );
  typia.assert(rejectedRegistration);
  // 5. Query pending registrations
  const pendingResults =
    await api.functional.ecommerceMall.admin.registrations.index(
      adminConnection,
      {
        body: {
          limit: 10,
          cursor: null,
          status: "pending",
          sellerId: null,
          reviewerId: null,
          createdAtFrom: null,
          createdAtTo: null,
          reviewedAtFrom: null,
          reviewedAtTo: null,
          sortBy: null,
          sortOrder: null,
        } satisfies IEcommerceMallSellerRegistration.IRequest,
      },
    );
  typia.assert(pendingResults);
  // Verify pending registration (registration1) exists and has null reviewer/rejectionReason
  const pendingReg = pendingResults.data.find((r) => r.id === registration1Id);
  TestValidator.predicate(
    "pending registration exists",
    pendingReg !== undefined,
  );
  if (pendingReg) {
    TestValidator.equals("pending status", pendingReg.status, "pending");
    TestValidator.equals("pending reviewer is null", pendingReg.reviewer, null);
    TestValidator.equals(
      "pending rejection reason is null",
      pendingReg.rejectionReason,
      null,
    );
    TestValidator.equals(
      "pending reviewedAt is null",
      pendingReg.reviewedAt,
      null,
    );
  }
  // 6. Query approved registrations
  const approvedResults =
    await api.functional.ecommerceMall.admin.registrations.index(
      adminConnection,
      {
        body: {
          limit: 10,
          cursor: null,
          status: "approved",
          sellerId: null,
          reviewerId: null,
          createdAtFrom: null,
          createdAtTo: null,
          reviewedAtFrom: null,
          reviewedAtTo: null,
          sortBy: null,
          sortOrder: null,
        } satisfies IEcommerceMallSellerRegistration.IRequest,
      },
    );
  typia.assert(approvedResults);
  // Verify approved registration (registration2) exists and has reviewer but null rejectionReason
  const approvedReg = approvedResults.data.find(
    (r) => r.id === registration2Id,
  );
  TestValidator.predicate(
    "approved registration exists",
    approvedReg !== undefined,
  );
  if (approvedReg) {
    TestValidator.equals("approved status", approvedReg.status, "approved");
    TestValidator.predicate(
      "approved reviewer exists",
      approvedReg.reviewer !== null,
    );
    TestValidator.equals(
      "approved rejection reason is null",
      approvedReg.rejectionReason,
      null,
    );
    TestValidator.predicate(
      "approved reviewedAt exists",
      approvedReg.reviewedAt !== null,
    );
    if (approvedReg.reviewer) {
      TestValidator.equals(
        "approved reviewer is the admin",
        approvedReg.reviewer.id,
        adminAuth.id,
      );
    }
  }
  // 7. Query rejected registrations
  const rejectedResults =
    await api.functional.ecommerceMall.admin.registrations.index(
      adminConnection,
      {
        body: {
          limit: 10,
          cursor: null,
          status: "rejected",
          sellerId: null,
          reviewerId: null,
          createdAtFrom: null,
          createdAtTo: null,
          reviewedAtFrom: null,
          reviewedAtTo: null,
          sortBy: null,
          sortOrder: null,
        } satisfies IEcommerceMallSellerRegistration.IRequest,
      },
    );
  typia.assert(rejectedResults);
  // Verify rejected registration (registration3) exists and has both reviewer and rejection reason
  const rejectedReg = rejectedResults.data.find(
    (r) => r.id === registration3Id,
  );
  TestValidator.predicate(
    "rejected registration exists",
    rejectedReg !== undefined,
  );
  if (rejectedReg) {
    TestValidator.equals("rejected status", rejectedReg.status, "rejected");
    TestValidator.predicate(
      "rejected reviewer exists",
      rejectedReg.reviewer !== null,
    );
    TestValidator.equals(
      "rejected rejection reason matches",
      rejectedReg.rejectionReason,
      rejectionReason,
    );
    TestValidator.predicate(
      "rejected reviewedAt exists",
      rejectedReg.reviewedAt !== null,
    );
    if (rejectedReg.reviewer) {
      TestValidator.equals(
        "rejected reviewer is the admin",
        rejectedReg.reviewer.id,
        adminAuth.id,
      );
    }
  }
}
