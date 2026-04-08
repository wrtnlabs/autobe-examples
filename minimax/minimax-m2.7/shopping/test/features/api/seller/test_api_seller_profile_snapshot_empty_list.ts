import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerProfileSnapshot";
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
 * Test retrieving seller profile snapshots when no profile edits have been made.
 *
 * Validates the system behavior when a seller who has never edited their profile
 * requests their profile snapshot history. The system must gracefully return an
 * empty list with proper pagination metadata without throwing errors.
 *
 * Business rule: "If no snapshots exist for the seller, the system must return
 * an empty list without error." This test verifies this requirement.
 *
 * 1. Register a new seller account with email and password.
 * 2. Admin authenticates to approve the seller registration.
 * 3. Admin approves the pending seller to grant full seller access.
 * 4. Authenticated approved seller retrieves profile snapshots.
 * 5. Validates response returns HTTP 200 with empty data array.
 * 6. Validates pagination metadata shows records: 0, pages: 0, current: 1, limit: default.
 */
export async function test_api_seller_profile_snapshot_empty_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Admin authenticates with its own credentials
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  // 3. Admin approves the seller
  const approvedSeller =
    await api.functional.ecommerceMall.admin.admin.sellers.approve(
      adminConnection,
      { sellerId: sellerAuth.id },
    );
  typia.assert(approvedSeller);
  // 4. Authenticated approved seller retrieves profile snapshots
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const snapshots =
    await api.functional.ecommerceMall.seller.sellers.me.profile.snapshots.list(
      sellerLoginConnection,
    );
  typia.assert(snapshots);
  // 5. Validate response returns HTTP 200 with empty data array
  TestValidator.equals("data array should be empty", snapshots.data.length, 0);
  TestValidator.equals("data should be empty array", snapshots.data, []);
  // 6. Validate pagination metadata
  TestValidator.equals("records should be 0", snapshots.pagination.records, 0);
  TestValidator.equals("pages should be 0", snapshots.pagination.pages, 0);
  TestValidator.equals("current should be 1", snapshots.pagination.current, 1);
  TestValidator.predicate(
    "limit should be non-negative",
    snapshots.pagination.limit >= 0,
  );
}
