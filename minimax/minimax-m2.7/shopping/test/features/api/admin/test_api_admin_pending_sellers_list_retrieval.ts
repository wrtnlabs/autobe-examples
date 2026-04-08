import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
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
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test admin retrieving the list of sellers with pending approval status.
 *
 * Validates the complete workflow where an administrator retrieves pending seller applications.
 * This test ensures that newly registered sellers appear in the pending list with correct status.
 *
 * 1. Administrator registers and authenticates to access the admin panel.
 * 2. Multiple sellers register - they start with 'pending' approval status by default.
 * 3. Admin retrieves pending sellers list via GET /ecommerceMall/admin/admin/sellers/pending.
 * 4. Validates response contains paginated data with correct pagination metadata.
 * 5. Verifies each pending seller has id, email, approvalStatus='pending', createdAt, and suspensionStatus.
 * 6. Confirms results are ordered by createdAt in descending order (newest first).
 * 7. Ensures sensitive fields like password_hash are excluded from response.
 */
export async function test_api_admin_pending_sellers_list_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // 2. Register multiple sellers (they will have 'pending' status by default)
  const sellerCount = 3;
  const sellerEmails: string[] = [];
  const sellerCreatedAts: Date[] = [];
  for (let i = 0; i < sellerCount; i++) {
    const sellerConnection: api.IConnection = { host: connection.host };
    const seller = await authorize_seller_join(sellerConnection, {});
    typia.assert(seller);
    sellerEmails.push(seller.email);
    sellerCreatedAts.push(new Date(seller.createdAt));
  }
  // 3. Retrieve pending sellers list as admin
  const pendingSellersPage =
    await api.functional.ecommerceMall.admin.admin.sellers.pending(
      adminConnection,
    );
  typia.assert(pendingSellersPage);
  // 4. Validate pagination metadata structure
  TestValidator.equals(
    "has pagination",
    pendingSellersPage.pagination !== undefined,
    true,
  );
  TestValidator.predicate(
    "has valid pagination current",
    pendingSellersPage.pagination.current >= 1,
  );
  TestValidator.predicate(
    "has valid pagination limit",
    pendingSellersPage.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "has valid records count",
    pendingSellersPage.pagination.records >= sellerCount,
  );
  TestValidator.predicate(
    "has valid pages count",
    pendingSellersPage.pagination.pages >= 1,
  );
  // 5. Validate pending sellers list is not empty and contains our created sellers
  TestValidator.predicate(
    "has pending sellers",
    pendingSellersPage.data.length > 0,
  );
  // 6. Find our registered sellers in the pending list and validate their structure
  const ourPendingSellers = pendingSellersPage.data.filter((seller) =>
    sellerEmails.includes(seller.email),
  );
  TestValidator.equals(
    "found all our pending sellers",
    ourPendingSellers.length,
    sellerCount,
  );
  // 7. Validate each pending seller structure
  for (const seller of ourPendingSellers) {
    // Validate required fields exist
    TestValidator.predicate(
      "has id",
      seller.id !== undefined && seller.id !== null,
    );
    TestValidator.predicate(
      "has email",
      seller.email !== undefined && seller.email !== null,
    );
    TestValidator.predicate(
      "has approvalStatus",
      seller.approvalStatus !== undefined,
    );
    TestValidator.predicate("has createdAt", seller.createdAt !== undefined);
    TestValidator.predicate(
      "has suspensionStatus",
      seller.suspensionStatus !== undefined,
    );
    // Validate approvalStatus is 'pending'
    TestValidator.equals(
      "approvalStatus is pending",
      seller.approvalStatus,
      "pending",
    );
    // Validate suspensionStatus is 'active'
    TestValidator.equals(
      "suspensionStatus is active",
      seller.suspensionStatus,
      "active",
    );
    // Validate sensitive fields are excluded
    TestValidator.equals(
      "password_hash excluded",
      (seller as any).password_hash === undefined,
      true,
    );
  }
  // 8. Validate ordering (createdAt descending - newest first)
  for (let i = 1; i < pendingSellersPage.data.length; i++) {
    const prev = new Date(pendingSellersPage.data[i - 1].createdAt);
    const curr = new Date(pendingSellersPage.data[i].createdAt);
    TestValidator.predicate(
      `sellers ordered by createdAt descending at index ${i}`,
      prev.getTime() >= curr.getTime(),
    );
  }
  // 9. Validate our sellers are in correct order (newest last registered should be first in list)
  const ourSellerSorted = [...ourPendingSellers].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  TestValidator.equals(
    "our sellers ordered correctly",
    ourPendingSellers.map((s) => s.email),
    ourSellerSorted.map((s) => s.email),
  );
}
