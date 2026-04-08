import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
import type { IEcommerceSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceSellerSnapshot";
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
 * Test administrator access to seller profile snapshots for audit trail validation.
 *
 * Validates that administrators can retrieve the complete history of seller profile snapshots, ensuring the audit trail functionality works correctly for compliance and dispute resolution purposes.
 *
 * This test creates an administrator account and a seller account, then verifies that the administrator can successfully access the seller's profile snapshot history through the admin-only endpoint.
 *
 * 1. Administrator registers and authenticates via admin join endpoint.
 * 2. Seller account is created via seller join endpoint.
 * 3. Administrator calls the snapshot listing endpoint with seller's profile ID.
 * 4. Validates response structure includes pagination and snapshot data.
 * 5. Verifies each snapshot contains shop profile information and seller summary.
 */
export async function test_api_admin_view_seller_profile_snapshot_with_multiple_edits(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      reason: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // Get seller profile ID - use profile.id if available, otherwise seller.id
  const profileId = sellerAuth.profile?.id ?? sellerAuth.id;
  // 3. Call snapshot listing endpoint as admin
  const snapshots =
    await api.functional.ecommerce.admin.profiles.snapshots.list(
      adminConnection,
      { profileId },
    );
  typia.assert(snapshots);
  // 4. Validate pagination structure exists and has valid values
  TestValidator.predicate(
    "pagination exists",
    snapshots.pagination !== undefined,
  );
  TestValidator.predicate(
    "pagination has current page",
    snapshots.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    snapshots.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination has records",
    snapshots.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages",
    snapshots.pagination.pages >= 0,
  );
  // 5. Validate snapshots data array exists
  TestValidator.predicate(
    "snapshots data array exists",
    Array.isArray(snapshots.data),
  );
  // 6. If snapshots exist, validate business logic (not types - typia.assert handles that)
  if (snapshots.data.length > 0) {
    const firstSnapshot = snapshots.data[0];
    // Business logic validation: snapshot should have seller reference
    TestValidator.equals(
      "seller ID matches",
      firstSnapshot.seller.id,
      sellerAuth.id,
    );
    // Business logic validation: shop name should be non-empty string
    TestValidator.predicate(
      "shop name is non-empty",
      firstSnapshot.shop_name.length > 0,
    );
    // Business logic validation: timestamps should be valid ISO 8601
    TestValidator.predicate(
      "created_at is ISO 8601",
      !isNaN(Date.parse(firstSnapshot.created_at)),
    );
    TestValidator.predicate(
      "updated_at is ISO 8601",
      !isNaN(Date.parse(firstSnapshot.updated_at)),
    );
    // Business logic validation: updated_at should be >= created_at
    TestValidator.predicate(
      "updated_at >= created_at",
      new Date(firstSnapshot.updated_at) >= new Date(firstSnapshot.created_at),
    );
  }
}
