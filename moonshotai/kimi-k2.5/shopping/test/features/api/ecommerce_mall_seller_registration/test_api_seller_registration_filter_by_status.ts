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

/**
 * Test seller registration filtering by status.
 * Authenticate as administrator, then filter registrations by pending, approved, and rejected status.
 * Validate each status filter returns correct registration data with appropriate reviewer and timestamp fields.
 */
export async function test_api_seller_registration_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Test filtering by 'pending' status
  const pendingResponse =
    await api.functional.ecommerceMall.admin.registrations.index(
      adminConnection,
      {
        body: {
          status: "pending",
        } satisfies IEcommerceMallSellerRegistration.IRequest,
      },
    );
  typia.assert(pendingResponse);
  // Validate all pending registrations
  for (const registration of pendingResponse.data) {
    TestValidator.equals(
      "pending registration status",
      registration.status,
      "pending",
    );
    TestValidator.equals(
      "pending registration reviewedAt is null",
      registration.reviewedAt,
      null,
    );
    TestValidator.equals(
      "pending registration reviewer is null",
      registration.reviewer,
      null,
    );
  }
  // 3. Test filtering by 'approved' status
  const approvedResponse =
    await api.functional.ecommerceMall.admin.registrations.index(
      adminConnection,
      {
        body: {
          status: "approved",
        } satisfies IEcommerceMallSellerRegistration.IRequest,
      },
    );
  typia.assert(approvedResponse);
  // Validate all approved registrations
  for (const registration of approvedResponse.data) {
    TestValidator.equals(
      "approved registration status",
      registration.status,
      "approved",
    );
    TestValidator.predicate(
      "approved registration reviewedAt is populated",
      registration.reviewedAt !== null,
    );
    TestValidator.predicate(
      "approved registration reviewer is populated",
      registration.reviewer !== null,
    );
  }
  // 4. Test filtering by 'rejected' status
  const rejectedResponse =
    await api.functional.ecommerceMall.admin.registrations.index(
      adminConnection,
      {
        body: {
          status: "rejected",
        } satisfies IEcommerceMallSellerRegistration.IRequest,
      },
    );
  typia.assert(rejectedResponse);
  // Validate all rejected registrations
  for (const registration of rejectedResponse.data) {
    TestValidator.equals(
      "rejected registration status",
      registration.status,
      "rejected",
    );
    TestValidator.predicate(
      "rejected registration rejectionReason is populated",
      registration.rejectionReason !== null &&
        registration.rejectionReason.length > 0,
    );
    TestValidator.predicate(
      "rejected registration reviewer is populated",
      registration.reviewer !== null,
    );
  }
}
