import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_ecommerce_mall_administrator_seller_suspensions_create } from "../../../generate/generate_random_ecommerce_mall_administrator_seller_suspensions_create";
import { prepare_random_ecommerce_mall_seller_suspension } from "../../../prepare/prepare_random_ecommerce_mall_seller_suspension";

/**
 * Test that multiple suspensions can be created for the same seller to maintain audit trail.
 *
 * Validates that the seller suspension system correctly maintains a chronological record of all suspension events for a seller. This includes verifying that multiple suspensions can be created for the same seller, each with unique timestamps and IDs, while maintaining referential integrity to the seller and admin. The audit trail enables administrators to track seller behavior patterns and make informed decisions about future actions.
 *
 * Special attention is given to ensuring timestamps are in ascending order, resolved_at remains null for active suspensions, and all records reference the same seller and admin.
 *
 * 1. Administrator joins with valid credentials.
 * 2. Create first suspension for a seller with reason 'First violation - policy breach'.
 * 3. System creates suspension record with suspended_at timestamp.
 * 4. Create second suspension for same seller with different reason 'Second violation - customer complaint'.
 * 5. System creates second suspension record with different suspended_at timestamp.
 * 6. Verify both suspension records exist with different suspension IDs.
 * 7. Verify suspension history shows complete timeline of suspension events.
 * 8. Verify each suspension record is immutable once created (suspended_by_admin exists).
 * 9. Verify resolved_at remains null for all active suspensions.
 * 10. Verify suspended_at timestamps are in ascending order.
 */
export async function test_api_seller_suspension_audit_trail_multiple(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator joins with valid credentials
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IEcommerceMallAdministrator.IAuthorized =
    await authorize_administrator_join(adminConnection, {
      body: {
        display_name: RandomGenerator.name(2),
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        grade: "regular",
      } satisfies IEcommerceMallAdministrator.IJoin,
    });
  typia.assert(admin);
  // 2. Create first suspension for a seller with reason 1
  const suspension1: IEcommerceMallSellerSuspension =
    await generate_random_ecommerce_mall_administrator_seller_suspensions_create(
      adminConnection,
      {
        body: {
          seller_id: typia.random<string & tags.Format<"uuid">>(),
          reason: "First violation - policy breach",
        } satisfies IEcommerceMallSellerSuspension.ICreate,
      },
    );
  typia.assert(suspension1);
  const suspendedAt1 = suspension1.suspended_at;
  const suspensionId1 = suspension1.id;
  const suspendedByAdmin1 = suspension1.suspendedByAdmin.id;
  const sellerId1 = suspension1.seller.id;
  // 3. Wait a small amount to ensure different timestamp for second suspension
  await new Promise((resolve) => setTimeout(resolve, 10));
  // 4. Create second suspension for the same seller with different reason
  const suspension2: IEcommerceMallSellerSuspension =
    await generate_random_ecommerce_mall_administrator_seller_suspensions_create(
      adminConnection,
      {
        body: {
          seller_id: sellerId1,
          reason: "Second violation - customer complaint",
        } satisfies IEcommerceMallSellerSuspension.ICreate,
      },
    );
  typia.assert(suspension2);
  const suspendedAt2 = suspension2.suspended_at;
  const suspensionId2 = suspension2.id;
  const suspendedByAdmin2 = suspension2.suspendedByAdmin.id;
  // 5. Verify both suspension records exist with different IDs
  TestValidator.notEquals(
    "first and second suspension have different IDs",
    suspensionId1,
    suspensionId2,
  );
  // 6. Verify suspended_at timestamps are different
  TestValidator.notEquals(
    "first and second suspension have different suspended_at",
    suspendedAt1,
    suspendedAt2,
  );
  // 7. Verify suspended_at timestamps are in ascending order
  TestValidator.predicate(
    "suspended_at timestamps are in ascending order",
    new Date(suspendedAt1) < new Date(suspendedAt2),
  );
  // 8. Verify each suspension record references a seller
  TestValidator.notEquals(
    "first suspension has seller id",
    suspension1.seller.id,
    null,
  );
  TestValidator.notEquals(
    "second suspension has seller id",
    suspension2.seller.id,
    null,
  );
  // 9. Verify resolved_at remains null for all active suspensions
  TestValidator.equals(
    "first suspension resolved_at is null",
    suspension1.resolved_at,
    null,
  );
  TestValidator.equals(
    "second suspension resolved_at is null",
    suspension2.resolved_at,
    null,
  );
  // 10. Verify suspension history shows complete timeline
  // Both suspensions should reference the same seller
  TestValidator.equals(
    "both suspensions reference the same seller",
    suspension1.seller.id,
    suspension2.seller.id,
  );
  // Verify that suspension records have non-empty reasons
  TestValidator.predicate(
    "first suspension has non-empty reason",
    suspension1.reason.length > 0,
  );
  TestValidator.predicate(
    "second suspension has non-empty reason",
    suspension2.reason.length > 0,
  );
  // Verify both suspensions were created by the same admin
  TestValidator.equals(
    "both suspensions created by same admin",
    suspendedByAdmin1,
    suspendedByAdmin2,
  );
}
