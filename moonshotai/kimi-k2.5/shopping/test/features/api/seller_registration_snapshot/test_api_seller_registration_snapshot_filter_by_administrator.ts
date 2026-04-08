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

export async function test_api_seller_registration_snapshot_filter_by_administrator(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create authenticated administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(adminAuth);
  // Step 2: Create authenticated seller (registration is auto-created)
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    },
  });
  typia.assert(sellerAuth);
  // Step 3: List registrations to find the seller's registration
  const registrationList =
    await api.functional.ecommerceMall.admin.registrations.index(
      adminConnection,
      {
        body: {
          sellerId: sellerAuth.id,
        } satisfies IEcommerceMallSellerRegistration.IRequest,
      },
    );
  typia.assert(registrationList);
  // Verify we found at least one registration for this seller
  TestValidator.predicate(
    "registration found for seller",
    registrationList.data.length > 0,
  );
  const registration = registrationList.data[0];
  const registrationId = registration.id;
  // Step 4: Review the registration to generate a snapshot with admin's ID
  const reviewResult =
    await api.functional.ecommerceMall.admin.registrations.update(
      adminConnection,
      {
        registrationId: registrationId,
        body: {
          status: "approved",
        } satisfies IEcommerceMallSellerRegistration.IUpdate,
      },
    );
  typia.assert(reviewResult);
  // Verify the review was recorded
  TestValidator.equals(
    "registration status after review",
    reviewResult.status,
    "approved",
  );
  // Step 5: Test snapshot filtering by adminId
  const adminId = adminAuth.id;
  const filteredSnapshots =
    await api.functional.ecommerceMall.admin.registrations.snapshots.index(
      adminConnection,
      {
        registrationId: registrationId,
        body: {
          adminId: adminId,
          createdAtFrom: null,
          createdAtTo: null,
          page: 1,
          limit: 10,
          sort: "created_at_desc",
        } satisfies IEcommerceMallSellerRegistrationSnapshot.IRequest,
      },
    );
  typia.assert(filteredSnapshots);
  // Validate filtered results
  TestValidator.predicate(
    "filtered results contain at least one snapshot",
    filteredSnapshots.data.length > 0,
  );
  TestValidator.predicate(
    "pagination page is correct",
    filteredSnapshots.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is correct",
    filteredSnapshots.pagination.limit === 10,
  );
  // Step 6: Test sorting with created_at_asc
  const ascSnapshots =
    await api.functional.ecommerceMall.admin.registrations.snapshots.index(
      adminConnection,
      {
        registrationId: registrationId,
        body: {
          adminId: null,
          createdAtFrom: null,
          createdAtTo: null,
          page: 1,
          limit: 10,
          sort: "created_at_asc",
        } satisfies IEcommerceMallSellerRegistrationSnapshot.IRequest,
      },
    );
  typia.assert(ascSnapshots);
  // Step 7: Test sorting with created_at_desc
  const descSnapshots =
    await api.functional.ecommerceMall.admin.registrations.snapshots.index(
      adminConnection,
      {
        registrationId: registrationId,
        body: {
          adminId: null,
          createdAtFrom: null,
          createdAtTo: null,
          page: 1,
          limit: 10,
          sort: "created_at_desc",
        } satisfies IEcommerceMallSellerRegistrationSnapshot.IRequest,
      },
    );
  typia.assert(descSnapshots);
  // Step 8: Test pagination with specific page and limit
  const paginatedSnapshots =
    await api.functional.ecommerceMall.admin.registrations.snapshots.index(
      adminConnection,
      {
        registrationId: registrationId,
        body: {
          adminId: null,
          createdAtFrom: null,
          createdAtTo: null,
          page: 1,
          limit: 5,
          sort: null,
        } satisfies IEcommerceMallSellerRegistrationSnapshot.IRequest,
      },
    );
  typia.assert(paginatedSnapshots);
  // Validate pagination is respected
  TestValidator.predicate(
    "paginated limit is respected",
    paginatedSnapshots.pagination.limit === 5,
  );
  TestValidator.predicate(
    "paginated page is correct",
    paginatedSnapshots.pagination.current === 1,
  );
  // Step 9: Test with date range filter
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const dateFilteredSnapshots =
    await api.functional.ecommerceMall.admin.registrations.snapshots.index(
      adminConnection,
      {
        registrationId: registrationId,
        body: {
          adminId: null,
          createdAtFrom: yesterday.toISOString(),
          createdAtTo: now.toISOString(),
          page: 1,
          limit: 10,
          sort: "created_at_desc",
        } satisfies IEcommerceMallSellerRegistrationSnapshot.IRequest,
      },
    );
  typia.assert(dateFilteredSnapshots);
}
