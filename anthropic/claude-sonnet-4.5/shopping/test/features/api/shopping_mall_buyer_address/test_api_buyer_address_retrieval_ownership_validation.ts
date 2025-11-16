import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallBuyerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyerAddress";

/**
 * Validates that buyers can only retrieve their own addresses and cannot access
 * addresses belonging to other buyers.
 *
 * This test ensures proper data isolation and security by:
 *
 * 1. Creating first buyer account (buyer A) and authenticating
 * 2. Creating an address owned by buyer A
 * 3. Creating second buyer account (buyer B) and authenticating
 * 4. Attempting to retrieve buyer A's address while authenticated as buyer B
 * 5. Verifying that the operation fails with authorization error
 *
 * This validates that the address retrieval endpoint properly enforces
 * ownership validation, preventing unauthorized access to other buyers' private
 * address data.
 */
export async function test_api_buyer_address_retrieval_ownership_validation(
  connection: api.IConnection,
) {
  // Step 1: Create first buyer account (buyer A)
  const buyerAEmail = typia.random<string & tags.Format<"email">>();
  const buyerA: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.join(connection, {
      body: {
        email: buyerAEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallBuyer.ICreate,
    });
  typia.assert(buyerA);

  // Step 2: Create an address owned by buyer A
  const buyerAAddress: IShoppingMallBuyerAddress =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.create(
      connection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          street_address_line1: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 3,
            wordMax: 7,
          }),
          street_address_line2: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 3,
            wordMax: 5,
          }),
          city: RandomGenerator.name(1),
          state: RandomGenerator.name(1),
          postal_code: (
            typia.random<
              number &
                tags.Type<"uint32"> &
                tags.Minimum<10000> &
                tags.Maximum<99999>
            >() satisfies number as number
          ).toString(),
          country: RandomGenerator.name(1),
          address_label: RandomGenerator.name(1),
          address_type: RandomGenerator.pick([
            "residential",
            "commercial",
          ] as const),
          special_delivery_instructions: RandomGenerator.paragraph({
            sentences: 2,
          }),
          is_default: true,
        } satisfies IShoppingMallBuyerAddress.ICreate,
      },
    );
  typia.assert(buyerAAddress);

  // Step 3: Create second buyer account (buyer B) and authenticate
  const buyerBEmail = typia.random<string & tags.Format<"email">>();
  const buyerB: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.join(connection, {
      body: {
        email: buyerBEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallBuyer.ICreate,
    });
  typia.assert(buyerB);

  // Step 4: Attempt to retrieve buyer A's address while authenticated as buyer B
  // This should fail because buyer B should not have access to buyer A's addresses
  await TestValidator.error(
    "buyer B cannot access buyer A's address",
    async () => {
      await api.functional.shoppingMall.buyer.buyers.me.addresses.at(
        connection,
        {
          addressId: buyerAAddress.id,
        },
      );
    },
  );
}
