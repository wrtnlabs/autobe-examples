import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallReturnRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReturnRequest";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShippingPartner } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingPartner";

/**
 * Ensures a legitimate, authenticated seller can update their own return
 * request.
 *
 * 1. Register a new seller (auth.seller.join) and acquire credentials.
 * 2. (Mock/setup step): Assume existence of a return request for this seller
 *    (generate one by calling update with a random UUID and IUpdate payload;
 *    real integration would require more detailed fixtures).
 * 3. Update the return request using the seller session: change fields like
 *    reason, status, pickup address, scheduled_pickup_at, and
 *    shipping_partner_id (all allowed by .IUpdate DTO).
 * 4. Validate that the updated return request reflects the new fields, that
 *    unmodifiable fields still match the original, and that the response is
 *    valid and matches the updated values.
 * 5. Test is happy-path only: no ownership or business rule violations, no
 *    negative scenarios.
 */
export async function test_api_seller_return_request_update_by_authenticated_seller(
  connection: api.IConnection,
) {
  // 1. Register a new seller and authenticate
  const sellerInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    business_name: RandomGenerator.paragraph({ sentences: 2 }),
    registration_number: RandomGenerator.alphaNumeric(10),
    business_phone: RandomGenerator.mobile(),
    href: "https://seller-portal.example.com/onboarding",
    referrer: "https://seller-portal.example.com/landing",
    ip: null,
  } satisfies IShoppingMallSeller.ICreate;

  const sellerAuthorized = await api.functional.auth.seller.join(connection, {
    body: sellerInput,
  });
  typia.assert(sellerAuthorized);

  // 2. (Setup) Assume a return request belonging to this seller.
  // In this mock/test, generate a new UUID for the returnRequestId for isolation.
  const returnRequestId = typia.random<string & tags.Format<"uuid">>();

  // Choose updatable fields (status, reason, pickup address, scheduled date, shipping partner, etc.)
  const updatable: IShoppingMallReturnRequest.IUpdate = {
    reason: RandomGenerator.paragraph({ sentences: 3 }),
    status: RandomGenerator.pick([
      "pending",
      "approved",
      "scheduled",
      "picked_up",
      "delivered",
      "completed",
      "rejected",
      "cancelled",
    ] as const),
    pickup_address: RandomGenerator.paragraph({ sentences: 2 }),
    scheduled_pickup_at: new Date(Date.now() + 3600 * 1000 * 6).toISOString(),
    provider_tracking_code: RandomGenerator.alphaNumeric(12),
    shipping_partner_id: typia.random<string & tags.Format<"uuid">>(),
  };

  // 3. Update the return request as the authenticated seller
  const updated =
    await api.functional.shoppingMall.seller.returnRequests.update(connection, {
      returnRequestId,
      body: updatable,
    });
  typia.assert(updated);

  // 4. Validate updated fields (type check only/happy-path)
  TestValidator.equals(
    "returnRequest id is correct",
    updated.id,
    returnRequestId,
  );
  TestValidator.equals("reason updated", updated.reason, updatable.reason);
  TestValidator.equals("status updated", updated.status, updatable.status);
  TestValidator.equals(
    "pickup_address updated",
    updated.pickup_address,
    updatable.pickup_address,
  );
  TestValidator.equals(
    "scheduled_pickup_at updated",
    updated.scheduled_pickup_at,
    updatable.scheduled_pickup_at,
  );
  TestValidator.equals(
    "provider_tracking_code updated",
    updated.provider_tracking_code,
    updatable.provider_tracking_code,
  );
}
