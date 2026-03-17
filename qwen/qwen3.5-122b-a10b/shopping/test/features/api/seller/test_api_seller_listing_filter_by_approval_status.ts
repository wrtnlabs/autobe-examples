import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_seller_listing_filter_by_approval_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>() as string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Test filtering by approval_status='pending'
  const pendingSellers = await api.functional.ecommerceMall.admin.sellers.index(
    adminConnection,
    {
      body: {
        approval_status: "pending",
        page: 1,
        limit: 20,
      } satisfies IEcommerceMallSeller.IRequest,
    },
  );
  typia.assert(pendingSellers);
  // Verify all returned sellers have pending status
  for (const seller of pendingSellers.data) {
    TestValidator.equals(
      "seller approval status is pending",
      seller.approval_status,
      "pending",
    );
  }
  // Verify pagination metadata
  TestValidator.predicate(
    "pagination has records",
    pendingSellers.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination current is 1",
    pendingSellers.pagination.current === 1,
  );
  // 3. Test filtering by approval_status='approved'
  const approvedSellers =
    await api.functional.ecommerceMall.admin.sellers.index(adminConnection, {
      body: {
        approval_status: "approved",
        page: 1,
        limit: 20,
      } satisfies IEcommerceMallSeller.IRequest,
    });
  typia.assert(approvedSellers);
  // Verify all returned sellers have approved status
  for (const seller of approvedSellers.data) {
    TestValidator.equals(
      "seller approval status is approved",
      seller.approval_status,
      "approved",
    );
  }
  // 4. Test filtering by approval_status='rejected'
  const rejectedSellers =
    await api.functional.ecommerceMall.admin.sellers.index(adminConnection, {
      body: {
        approval_status: "rejected",
        page: 1,
        limit: 20,
      } satisfies IEcommerceMallSeller.IRequest,
    });
  typia.assert(rejectedSellers);
  // Verify all returned sellers have rejected status
  for (const seller of rejectedSellers.data) {
    TestValidator.equals(
      "seller approval status is rejected",
      seller.approval_status,
      "rejected",
    );
  }
  // 5. Test combined filter: approval_status='pending' with account_status='active'
  const combinedFilteredSellers =
    await api.functional.ecommerceMall.admin.sellers.index(adminConnection, {
      body: {
        approval_status: "pending",
        account_status: "active",
        page: 1,
        limit: 20,
      } satisfies IEcommerceMallSeller.IRequest,
    });
  typia.assert(combinedFilteredSellers);
  // Verify all returned sellers match both filters
  for (const seller of combinedFilteredSellers.data) {
    TestValidator.equals(
      "seller approval status is pending",
      seller.approval_status,
      "pending",
    );
    TestValidator.equals(
      "seller account status is active",
      seller.account_status,
      "active",
    );
  }
  // 6. Verify rejected sellers include rejection_reason field when applicable
  if (rejectedSellers.data.length > 0) {
    const hasRejectionReason = rejectedSellers.data.some(
      (seller) =>
        seller.rejection_reason !== null &&
        seller.rejection_reason !== undefined,
    );
    TestValidator.predicate(
      "at least one rejected seller has rejection reason",
      hasRejectionReason || rejectedSellers.data.length === 0,
    );
  }
}