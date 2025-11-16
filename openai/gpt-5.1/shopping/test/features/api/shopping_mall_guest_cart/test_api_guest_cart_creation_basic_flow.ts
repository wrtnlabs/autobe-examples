import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallGuestCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestCart";
import type { IShoppingMallGuestCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestCartItem";

/**
 * Validate basic guest cart creation flow for unauthenticated visitors.
 *
 * Business purpose:
 *
 * - Ensure that an anonymous client can create a guest cart via the public POST
 *   /shoppingMall/guestCarts endpoint without any authentication.
 * - Verify that client context metadata (guest_token, ip, user_agent, referrer,
 *   region_code) is accepted and echoed appropriately.
 * - Confirm that a newly created guest cart is structurally valid and ready for
 *   subsequent item operations (items collection initialized, no soft-deletion
 *   timestamp).
 *
 * Steps:
 *
 * 1. Construct a realistic IShoppingMallGuestCart.ICreate payload with opaque
 *    guest_token and optional client metadata.
 * 2. Call api.functional.shoppingMall.guestCarts.create(connection, { body }).
 * 3. Assert that the response conforms to IShoppingMallGuestCart via typia.assert.
 * 4. Perform business checks:
 *
 *    - Guest_token echoes the request.
 *    - Id is non-empty (UUID format is already guaranteed by typia.assert).
 *    - Created_at and updated_at are present (non-empty strings).
 *    - Deleted_at is unset for a new cart.
 *    - Items is an empty array on initial creation.
 */
export async function test_api_guest_cart_creation_basic_flow(
  connection: api.IConnection,
) {
  // 1. Build request body for guest cart creation
  const body = {
    guest_token: RandomGenerator.alphaNumeric(32),
    ip: "203.0.113.42",
    user_agent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    referrer: "https://www.example.com/landing-page",
    region_code: "KR",
  } satisfies IShoppingMallGuestCart.ICreate;

  // 2. Call the public guest cart creation endpoint (no authentication required)
  const output: IShoppingMallGuestCart =
    await api.functional.shoppingMall.guestCarts.create(connection, {
      body,
    });

  // 3. Structural validation of response type
  typia.assert(output);

  // 4. Business logic validations

  // 4-1. guest_token must echo the request payload
  TestValidator.equals(
    "guest cart guest_token must match the request body",
    output.guest_token,
    body.guest_token,
  );

  // 4-2. id should be a non-empty UUID string (format already validated)
  TestValidator.predicate(
    "guest cart id must be a non-empty string",
    output.id.length > 0,
  );

  // 4-3. created_at and updated_at must be present and non-empty
  TestValidator.predicate(
    "guest cart created_at must be a non-empty string",
    output.created_at.length > 0,
  );
  TestValidator.predicate(
    "guest cart updated_at must be a non-empty string",
    output.updated_at.length > 0,
  );

  // 4-4. Newly created guest cart must not have a deleted_at timestamp
  TestValidator.equals(
    "deleted_at should be undefined for a new guest cart",
    output.deleted_at,
    undefined,
  );

  // 4-5. Items collection should exist and be empty on initial creation
  TestValidator.predicate(
    "guest cart items must be an empty array on initial creation",
    Array.isArray(output.items) && output.items.length === 0,
  );
}
