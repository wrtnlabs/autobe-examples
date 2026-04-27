import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerApprovalRequest";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import type { IECommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallSellerProfileSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test that an administrator can filter seller profile snapshots by date range.
 *
 * Creates an administrator and seller account, approves the seller's registration, then queries the seller's profile snapshots with a date range filter. Validates that the paginated response structure is correct and consistent.
 *
 * Since profile editing APIs are not available to generate actual snapshots, this test focuses on the structural validity and pagination metadata of the endpoint response rather than snapshot content filtering.
 *
 * 1. Register a new administrator account.
 * 2. Register a new seller account (approval_status: 'pending').
 * 3. Seller submits an approval request.
 * 4. Administrator approves the seller's registration.
 * 5. Administrator queries seller profile snapshots with a broad date range filter.
 * 6. Validate pagination metadata consistency.
 */
export async function test_api_seller_profile_snapshots_admin_filter_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  typia.assert(admin);
  // 2. Register a new seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallSeller.IJoin,
  });
  typia.assert(seller);
  // 3. Seller submits an approval request
  const approvalRequest =
    await api.functional.eCommerceMall.seller.approval_requests.create(
      sellerConnection,
    );
  typia.assert(approvalRequest);
  // 4. Administrator approves the seller's registration
  const approvedRequest =
    await api.functional.eCommerceMall.administrator.approval_requests.update(
      adminConnection,
      {
        requestId: approvalRequest.id,
        body: {
          status: "approved",
        } satisfies IECommerceMallSellerApprovalRequest.IUpdate,
      },
    );
  typia.assert(approvedRequest);
  // 5. Administrator queries seller profile snapshots with a date range filter
  const snapshotPage =
    await api.functional.eCommerceMall.administrator.sellers.profile.snapshots.index(
      adminConnection,
      {
        sellerId: seller.id,
        body: {
          page: 1,
          limit: 10,
          created_at: {
            gte: "2020-01-01T00:00:00.000Z",
            lte: "2030-01-01T00:00:00.000Z",
          },
        } satisfies IECommerceMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(snapshotPage);
  // 6. Validate pagination metadata consistency
  TestValidator.equals(
    "pagination current page",
    snapshotPage.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", snapshotPage.pagination.limit, 10);
  TestValidator.predicate(
    "pagination records non-negative",
    snapshotPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    snapshotPage.pagination.pages >= 0,
  );
  TestValidator.predicate("data is an array", Array.isArray(snapshotPage.data));
  // 7. If snapshots exist, validate each snapshot's created_at falls within the filter range
  for (const snapshot of snapshotPage.data) {
    const createdAt = new Date(snapshot.created_at).getTime();
    const gte = new Date("2020-01-01T00:00:00.000Z").getTime();
    const lte = new Date("2030-01-01T00:00:00.000Z").getTime();
    TestValidator.predicate(
      `snapshot ${snapshot.id} created_at within range`,
      createdAt >= gte && createdAt <= lte,
    );
  }
}
