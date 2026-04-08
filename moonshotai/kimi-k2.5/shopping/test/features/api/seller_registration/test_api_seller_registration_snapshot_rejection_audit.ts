import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
import type { IEcommerceMallSellerRegistrationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistrationSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerRegistration";
import type { IPageIEcommerceMallSellerRegistrationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerRegistrationSnapshot";
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

export async function test_api_seller_registration_snapshot_rejection_audit(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "AdminPass123!",
      href: "https://test.mall.com/admin",
      referrer: "https://test.mall.com",
      ip: null,
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Create seller account to generate registration
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: "SellerPass456!",
      href: "https://test.mall.com/seller",
      referrer: "https://test.mall.com",
      ip: null,
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // 3. List registrations to find the created registration
  const registrations =
    await api.functional.ecommerceMall.admin.registrations.index(
      adminConnection,
      {
        body: {
          page: undefined,
          limit: undefined,
          status: "pending",
          sellerId: undefined,
          reviewerId: undefined,
          search: sellerEmail,
          createdAt: undefined,
        } satisfies IEcommerceMallSellerRegistration.IRequest,
      },
    );
  typia.assert(registrations);
  // Assert at least one registration found
  TestValidator.predicate("registration exists", registrations.data.length > 0);
  const registration = registrations.data[0];
  // 4. Reject the registration with a specific rejection reason
  const rejectionReason =
    "Incomplete business documentation. Please submit valid business license and tax registration certificate.";
  const rejectedRegistration =
    await api.functional.ecommerceMall.admin.registrations.update(
      adminConnection,
      {
        registrationId: registration.id,
        body: {
          status: "rejected",
          rejectionReason,
        } satisfies IEcommerceMallSellerRegistration.IUpdate,
      },
    );
  typia.assert(rejectedRegistration);
  TestValidator.equals(
    "registration status is rejected",
    rejectedRegistration.status,
    "rejected",
  );
  TestValidator.equals(
    "rejection reason matches",
    rejectedRegistration.rejectionReason,
    rejectionReason,
  );
  // 5. Retrieve snapshots for the registration
  const snapshots =
    await api.functional.ecommerceMall.admin.registrations.snapshots.index(
      adminConnection,
      {
        registrationId: registration.id,
        body: {
          adminId: null,
          createdAtFrom: null,
          createdAtTo: null,
          page: null,
          limit: null,
          sort: "created_at_desc",
        } satisfies IEcommerceMallSellerRegistrationSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  // 6. Validate snapshot contains rejection information
  TestValidator.predicate("snapshots exist", snapshots.data.length > 0);
  // Get the most recent snapshot (should be the rejection)
  const rejectionSnapshot = snapshots.data[0];
  typia.assert(rejectionSnapshot);
  TestValidator.equals(
    "snapshot status is rejected",
    rejectionSnapshot.status,
    "rejected",
  );
  TestValidator.equals(
    "snapshot rejectionReason matches input",
    rejectionSnapshot.rejectionReason,
    rejectionReason,
  );
  TestValidator.predicate(
    "snapshot references correct registration",
    rejectionSnapshot.sellerRegistration.id === registration.id,
  );
  TestValidator.predicate(
    "snapshot has valid creation timestamp",
    rejectionSnapshot.createdAt !== null,
  );
}