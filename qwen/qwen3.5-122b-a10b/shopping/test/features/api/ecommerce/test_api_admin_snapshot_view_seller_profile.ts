import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator viewing seller profile snapshot for audit and compliance verification.
 *
 * Validates that an authenticated administrator can retrieve a specific seller profile snapshot by its unique identifier. The snapshot contains denormalized historical data of the seller's profile at the time it was created, including shop name, description, and logo URL. This enables administrators to audit profile changes, resolve disputes, and verify compliance with platform policies.
 *
 * The test ensures the snapshot response includes all required fields and properly references the associated seller account. Snapshots are immutable and cannot be modified or deleted, preserving an accurate audit trail.
 *
 * 1. Administrator authenticates via admin join endpoint.
 * 2. Generate a valid seller profile snapshot UUID.
 * 3. Retrieve the seller profile snapshot using the admin snapshots endpoint.
 * 4. Validate the snapshot response structure and field values.
 * 5. Verify the associated seller summary is included with current profile data.
 * 6. Confirm snapshot immutability (deleted_at is null).
 */
export async function test_api_admin_snapshot_view_seller_profile(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      reason: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Generate snapshot ID for seller profile snapshot
  const snapshotId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Retrieve the seller profile snapshot
  const snapshot = await api.functional.ecommerce.admin.snapshots.at(
    adminConnection,
    {
      snapshotId,
    },
  );
  typia.assert(snapshot);
  // 4. Validate snapshot structure
  TestValidator.equals("snapshot ID is valid UUID", snapshot.id, snapshotId);
  TestValidator.predicate("shop name exists", snapshot.shop_name.length > 0);
  TestValidator.predicate(
    "created_at is valid datetime",
    snapshot.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is valid datetime",
    snapshot.updated_at.length > 0,
  );
  TestValidator.predicate(
    "deleted_at is null for immutable snapshot",
    snapshot.deleted_at === null,
  );
  // 5. Validate seller summary
  TestValidator.predicate(
    "seller ID is valid UUID",
    snapshot.seller.id.length > 0,
  );
  TestValidator.equals(
    "seller shop name matches snapshot",
    snapshot.seller.shop_name,
    snapshot.shop_name,
  );
  TestValidator.predicate(
    "seller approval status exists",
    snapshot.seller.approval_status.length > 0,
  );
  TestValidator.predicate(
    "seller is_suspended is boolean",
    typeof snapshot.seller.is_suspended === "boolean",
  );
  TestValidator.predicate(
    "seller is_banned is boolean",
    typeof snapshot.seller.is_banned === "boolean",
  );
  TestValidator.predicate(
    "seller created_at is valid datetime",
    snapshot.seller.created_at.length > 0,
  );
  // 6. Validate optional fields
  if (snapshot.shop_description !== null) {
    TestValidator.predicate(
      "shop description is string",
      typeof snapshot.shop_description === "string",
    );
  }
  if (snapshot.logo_url !== null) {
    TestValidator.predicate(
      "logo URL is valid URI",
      snapshot.logo_url.length > 0,
    );
  }
}
