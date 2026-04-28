import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import type { IEcommercePlatformCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCancellationRequest";
import type { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import type { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import type { IEcommercePlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrder";
import type { IEcommercePlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrderItem";
import type { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import type { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import type { IEcommercePlatformReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformReview";
import type { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
import type { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import type { IEcommercePlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShippingAddress";
import type { IEcommercePlatformSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshot";
import type { IEcommercePlatformSnapshotCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshotCancellationRequest";
import type { IEcommercePlatformSnapshotOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshotOrderItem";
import type { IEcommercePlatformSnapshotProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshotProduct";
import type { IEcommercePlatformSnapshotRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshotRefundRequest";
import type { IEcommercePlatformSnapshotReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshotReview";
import type { IEcommercePlatformSnapshotSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshotSellerProfile";
import type { IEcommercePlatformSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshotVariant";
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
 * Test administrator retrieval of a specific snapshot record by its unique identifier.
 *
 * Validates the complete admin snapshot retrieval workflow including administrative authentication and direct snapshot lookup. Ensures that the returned snapshot contains valid structural data including the snapshot identifier, entity type classification, and creation timestamp.
 *
 * Special attention is given to verifying the polymorphic subtype structure: exactly one of the seven possible snapshot subtype relations (product, variant, seller profile, order item, review, cancellation request, or refund request) must be populated, matching the declared entity type value. This ensures the audit trail data integrity for dispute resolution.
 *
 * 1. Authenticate as administrator with randomized credentials for platform access.
 * 2. Retrieve a specific snapshot record using its unique UUID identifier.
 * 3. Validate the snapshot contains the id, entityType, and createdAt fields.
 * 4. Verify exactly one polymorphic subtype relation is populated matching the entity type.
 * 5. Confirm the snapshot represents immutable historical state data.
 */
export async function test_api_admin_snapshot_retrieval_by_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Retrieve snapshot by ID
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const snapshot = await api.functional.ecommercePlatform.admin.snapshots.at(
    adminConnection,
    { snapshotId },
  );
  typia.assert(snapshot);
  // 3. Validate snapshot core fields match request
  TestValidator.equals("snapshot id matches request", snapshot.id, snapshotId);
  TestValidator.predicate(
    "entity type is non-empty",
    snapshot.entityType.length > 0,
  );
  TestValidator.predicate(
    "has creation timestamp",
    typeof snapshot.createdAt === "string",
  );
  // 4. Verify polymorphic structure - exactly one subtype relation is populated
  const entityTypeValues = [
    "product",
    "product_variant",
    "seller_profile",
    "order_item",
    "review",
    "cancellation_request",
    "refund_request",
  ] as const;
  TestValidator.predicate(
    "entity type is valid",
    entityTypeValues.includes(
      snapshot.entityType as (typeof entityTypeValues)[number],
    ),
  );
  // Count populated subtype relations
  const populatedSubtypes = [
    snapshot.snapshotProduct !== null,
    snapshot.variantSnapshot !== null,
    snapshot.sellerProfileSnapshot !== null,
    snapshot.orderItemSnapshot !== null,
    snapshot.reviewSnapshot !== null,
    snapshot.cancellationRequest !== null,
    snapshot.refundRequest !== null,
  ].filter(Boolean).length;
  TestValidator.equals(
    "exactly one subtype relation populated",
    populatedSubtypes,
    1,
  );
  // 5. Validate entity type matches the populated subtype field
  const snapshotTypeMap: Record<string, boolean> = {
    product: snapshot.snapshotProduct !== null,
    product_variant: snapshot.variantSnapshot !== null,
    seller_profile: snapshot.sellerProfileSnapshot !== null,
    order_item: snapshot.orderItemSnapshot !== null,
    review: snapshot.reviewSnapshot !== null,
    cancellation_request: snapshot.cancellationRequest !== null,
    refund_request: snapshot.refundRequest !== null,
  };
  TestValidator.predicate(
    "entity type matches populated subtype",
    snapshotTypeMap[snapshot.entityType] === true,
  );
}
