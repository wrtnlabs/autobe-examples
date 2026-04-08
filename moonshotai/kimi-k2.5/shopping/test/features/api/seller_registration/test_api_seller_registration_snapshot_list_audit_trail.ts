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

export async function test_api_seller_registration_snapshot_list_audit_trail(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication - use utility function
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create seller - use utility function to create seller and registration
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    },
  });
  // 3. Find the registration for the seller
  const registrationRequest: IEcommerceMallSellerRegistration.IRequest = {
    page: 1,
    limit: 20,
    sellerId: undefined,
    status: "pending",
    search: sellerEmail,
  };
  const registrationList =
    await api.functional.ecommerceMall.admin.registrations.index(
      adminConnection,
      { body: registrationRequest },
    );
  typia.assert(registrationList);
  // Verify we found at least one registration
  if (registrationList.data.length === 0) {
    throw new Error("No registration found for the seller");
  }
  const registration = registrationList.data[0];
  const registrationId = registration.id;
  // 4. Review the registration to generate a snapshot (approve it)
  const reviewBody: IEcommerceMallSellerRegistration.IUpdate = {
    status: "approved",
    rejectionReason: undefined,
  };
  const updatedRegistration =
    await api.functional.ecommerceMall.admin.registrations.update(
      adminConnection,
      {
        registrationId,
        body: reviewBody,
      },
    );
  typia.assert(updatedRegistration);
  // 5. Call target endpoint: PATCH /ecommerceMall/admin/registrations/{registrationId}/snapshots
  const snapshotRequest: IEcommerceMallSellerRegistrationSnapshot.IRequest = {
    adminId: null,
    createdAtFrom: null,
    createdAtTo: null,
    page: null,
    limit: null,
    sort: "created_at_desc",
  };
  const snapshotList =
    await api.functional.ecommerceMall.admin.registrations.snapshots.index(
      adminConnection,
      {
        registrationId,
        body: snapshotRequest,
      },
    );
  typia.assert(snapshotList);
  // 6. Validate pagination metadata
  TestValidator.equals(
    "pagination current should be >= 0",
    snapshotList.pagination.current >= 0,
    true,
  );
  TestValidator.equals(
    "pagination limit should be >= 0",
    snapshotList.pagination.limit >= 0,
    true,
  );
  TestValidator.equals(
    "pagination records should be >= 0",
    snapshotList.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pagination pages should be >= 0",
    snapshotList.pagination.pages >= 0,
    true,
  );
  // 7. Validate snapshot records exist (business logic check)
  TestValidator.equals(
    "should have at least one snapshot",
    snapshotList.data.length > 0,
    true,
  );
  // 8. Verify snapshots ordered by created_at DESC (newest first) - business behavior testing
  if (snapshotList.data.length > 1) {
    for (let i = 0; i < snapshotList.data.length - 1; i++) {
      const current = new Date(snapshotList.data[i]!.createdAt).getTime();
      const next = new Date(snapshotList.data[i + 1]!.createdAt).getTime();
      TestValidator.predicate(
        `snapshot ${i} should be newer than snapshot ${i + 1}`,
        () => current >= next,
      );
    }
  }
  // 9. Verify sellerRegistration reference integrity - business logic check
  const firstSnapshot = snapshotList.data[0]!;
  TestValidator.equals(
    "sellerRegistration id matches registration",
    firstSnapshot.sellerRegistration.id,
    registrationId,
  );
}
