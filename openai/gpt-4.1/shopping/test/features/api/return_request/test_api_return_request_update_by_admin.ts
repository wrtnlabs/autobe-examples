import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallReturnRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReturnRequest";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShippingPartner } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingPartner";

/**
 * E2E test for admin updating a return/pickup request.
 *
 * 1. Register a new admin user (join).
 * 2. Simulate an existing return request (setup via typia.random for test
 *    isolation).
 * 3. Admin updates allowed fields: status, reason, tracking code, pickup date,
 *    shipping partner.
 * 4. Validate updated response:
 *
 *    - Allowed fields reflect modifications.
 *    - Updated fields change, others remain the same (e.g., created_at).
 *    - Audit timestamp updated (updated_at != created_at).
 *    - Prohibited changes (to system-managed fields) are not permitted.
 * 5. Edge cases:
 *
 *    - Attempt an invalid status transition and expect error.
 *    - Attempt to update with missing or invalid fields (expect error).
 *    - Ensure created_at, id, and other system-managed fields are unmodified.
 */
export async function test_api_return_request_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const adminInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) + "Aa!",
    name: RandomGenerator.name(2),
  } satisfies IShoppingMallAdmin.ICreate;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminInput,
    });
  typia.assert(admin);

  // 2. Simulate an existing return request
  const origReturnReq: IShoppingMallReturnRequest =
    typia.random<IShoppingMallReturnRequest>();
  typia.assert(origReturnReq);

  // 3. Prepare allowed update fields
  const newReason = RandomGenerator.paragraph({ sentences: 2 });
  const newStatus = RandomGenerator.pick([
    "approved",
    "scheduled",
    "picked_up",
    "delivered",
    "completed",
    "rejected",
    "cancelled",
  ] as const);
  const newPickupAddress = RandomGenerator.paragraph({ sentences: 1 });
  const newScheduledPickup = new Date(Date.now() + 86400000).toISOString();
  const newTrackingCode = RandomGenerator.alphaNumeric(10);
  const newShippingPartnerId = typia.random<string & tags.Format<"uuid">>();

  // 4. Perform the update (allowed fields)
  const updateInput = {
    reason: newReason,
    status: newStatus,
    pickup_address: newPickupAddress,
    scheduled_pickup_at: newScheduledPickup,
    provider_tracking_code: newTrackingCode,
    shipping_partner_id: newShippingPartnerId,
  } satisfies IShoppingMallReturnRequest.IUpdate;

  const updated: IShoppingMallReturnRequest =
    await api.functional.shoppingMall.admin.returnRequests.update(connection, {
      returnRequestId: origReturnReq.id,
      body: updateInput,
    });
  typia.assert(updated);

  // 5. Validate allowed field changes
  TestValidator.equals("reason updated", updated.reason, newReason);
  TestValidator.equals("status updated", updated.status, newStatus);
  TestValidator.equals(
    "pickup address updated",
    updated.pickup_address,
    newPickupAddress,
  );
  TestValidator.equals(
    "scheduled pickup updated",
    updated.scheduled_pickup_at,
    newScheduledPickup,
  );
  TestValidator.equals(
    "tracking code updated",
    updated.provider_tracking_code,
    newTrackingCode,
  );
  if (updated.shippingPartner)
    TestValidator.equals(
      "shipping partner id updated",
      updated.shippingPartner.id,
      newShippingPartnerId,
    );
  TestValidator.notEquals(
    "updated_at must change after update",
    updated.updated_at,
    origReturnReq.updated_at,
  );
  TestValidator.equals(
    "created_at unchanged",
    updated.created_at,
    origReturnReq.created_at,
  );
  TestValidator.equals("id unchanged", updated.id, origReturnReq.id);

  // 6. Edge case: prohibited status transition (simulate from completed → pending)
  const invalidStatus = "pending";
  if (updated.status === "completed") {
    await TestValidator.error(
      "prohibited status transition should fail",
      async () => {
        await api.functional.shoppingMall.admin.returnRequests.update(
          connection,
          {
            returnRequestId: updated.id,
            body: {
              status: invalidStatus,
            } satisfies IShoppingMallReturnRequest.IUpdate,
          },
        );
      },
    );
  }

  // 7. Edge case: updating with missing fields (should error if required under workflow)
  await TestValidator.error("update with empty body should fail", async () => {
    await api.functional.shoppingMall.admin.returnRequests.update(connection, {
      returnRequestId: updated.id,
      body: {} satisfies IShoppingMallReturnRequest.IUpdate,
    });
  });

  // 8. Edge case: attempt to update system-managed fields (should have no effect)
  // Only allowed fields are updated, so created_at and id must remain constant
  const sysFieldUpdate: IShoppingMallReturnRequest.IUpdate = {
    // no system fields, cannot modify id or created_at via IUpdate DTO
  };
  const afterNoop =
    await api.functional.shoppingMall.admin.returnRequests.update(connection, {
      returnRequestId: updated.id,
      body: sysFieldUpdate,
    });
  typia.assert(afterNoop);
  TestValidator.equals(
    "created_at remains unchanged after noop",
    afterNoop.created_at,
    updated.created_at,
  );
  TestValidator.equals(
    "id remains unchanged after noop",
    afterNoop.id,
    updated.id,
  );
}
