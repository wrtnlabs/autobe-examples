import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
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
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_registrations_create } from "../../../generate/generate_random_ecommerce_mall_seller_registrations_create";
import { prepare_random_ecommerce_mall_seller_registration } from "../../../prepare/prepare_random_ecommerce_mall_seller_registration";

export async function test_api_seller_registration_snapshot_filtered_by_reviewer_and_date(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account and submit registration
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  const registration =
    await generate_random_ecommerce_mall_seller_registrations_create(
      sellerConnection,
      {},
    );
  typia.assert(registration);
  // 2. Create admin account to review the registration
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // Get registration ID (cast since IEcommerceMallSellerRegistration is empty object but has id from DB)
  const registrationId = (registration as any).id as string;
  // Record time before review
  const beforeReview = new Date();
  beforeReview.setSeconds(beforeReview.getSeconds() - 5);
  // Review the registration (approve it) - this creates a snapshot
  const reviewed =
    await api.functional.ecommerceMall.admin.seller_registrations.update(
      adminConnection,
      {
        registrationId,
        body: {
          status: "approved",
          rejection_reason: null,
        } satisfies IEcommerceMallSellerRegistration.IUpdate,
      },
    );
  typia.assert(reviewed);
  // Record time after review
  const afterReview = new Date();
  afterReview.setSeconds(afterReview.getSeconds() + 5);
  // 3. Query snapshots filtered by reviewerId and date range
  const snapshots =
    await api.functional.ecommerceMall.admin.seller.registration_snapshots.index(
      adminConnection,
      {
        body: {
          reviewerId: admin.id,
          createdAtFrom: beforeReview.toISOString(),
          createdAtTo: afterReview.toISOString(),
          sortBy: "created_at",
          sortDirection: "desc",
        } satisfies IEcommerceMallSellerRegistrationSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  // 4. Validate that results match the reviewer filter
  TestValidator.predicate(
    "snapshots found for reviewer",
    snapshots.data.length > 0,
  );
  TestValidator.predicate(
    "all snapshots match reviewerId filter",
    snapshots.data.every((s) => s.reviewer?.id === admin.id),
  );
  TestValidator.predicate(
    "all snapshots within date range",
    snapshots.data.every((s) => {
      const createdAt = new Date(s.createdAt).getTime();
      return (
        createdAt >= beforeReview.getTime() &&
        createdAt <= afterReview.getTime()
      );
    }),
  );
  // 5. Test sorting by created_at in ascending order
  const snapshotsAsc =
    await api.functional.ecommerceMall.admin.seller.registration_snapshots.index(
      adminConnection,
      {
        body: {
          reviewerId: admin.id,
          createdAtFrom: beforeReview.toISOString(),
          createdAtTo: afterReview.toISOString(),
          sortBy: "created_at",
          sortDirection: "asc",
        } satisfies IEcommerceMallSellerRegistrationSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsAsc);
  // Validate ascending sort order
  if (snapshotsAsc.data.length > 1) {
    TestValidator.predicate("ascending sort order is correct", () => {
      for (let i = 0; i < snapshotsAsc.data.length - 1; i++) {
        const current = new Date(snapshotsAsc.data[i].createdAt).getTime();
        const next = new Date(snapshotsAsc.data[i + 1].createdAt).getTime();
        if (current > next) return false;
      }
      return true;
    });
  }
  // 6. Test sorting by created_at in descending order
  const snapshotsDesc =
    await api.functional.ecommerceMall.admin.seller.registration_snapshots.index(
      adminConnection,
      {
        body: {
          reviewerId: admin.id,
          createdAtFrom: beforeReview.toISOString(),
          createdAtTo: afterReview.toISOString(),
          sortBy: "created_at",
          sortDirection: "desc",
        } satisfies IEcommerceMallSellerRegistrationSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsDesc);
  // Validate descending sort order
  if (snapshotsDesc.data.length > 1) {
    TestValidator.predicate("descending sort order is correct", () => {
      for (let i = 0; i < snapshotsDesc.data.length - 1; i++) {
        const current = new Date(snapshotsDesc.data[i].createdAt).getTime();
        const next = new Date(snapshotsDesc.data[i + 1].createdAt).getTime();
        if (current < next) return false;
      }
      return true;
    });
  }
  // 7. Test date range filtering - query with a future date range that should return no results
  const futureFrom = new Date();
  futureFrom.setFullYear(futureFrom.getFullYear() + 1);
  const futureTo = new Date();
  futureTo.setFullYear(futureTo.getFullYear() + 2);
  const emptyResult =
    await api.functional.ecommerceMall.admin.seller.registration_snapshots.index(
      adminConnection,
      {
        body: {
          reviewerId: admin.id,
          createdAtFrom: futureFrom.toISOString(),
          createdAtTo: futureTo.toISOString(),
        } satisfies IEcommerceMallSellerRegistrationSnapshot.IRequest,
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals(
    "future date range returns empty results",
    emptyResult.data.length,
    0,
  );
}
