import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallBuyerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyerAddress";

/**
 * Test creating delivery addresses with various special delivery instructions.
 *
 * This test validates that the special_delivery_instructions field correctly
 * stores detailed instructions such as gate codes, building entry procedures,
 * preferred delivery locations, recipient availability windows, and safe
 * drop-off locations.
 *
 * Test steps:
 *
 * 1. Create a new buyer account through registration
 * 2. Create multiple addresses with different types of delivery instructions
 * 3. Verify each instruction type is stored correctly within the 500-character
 *    limit
 * 4. Validate that all instruction text is accurately preserved in responses
 */
export async function test_api_buyer_address_creation_with_special_delivery_instructions(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate buyer account
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyer: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.join(connection, {
      body: {
        email: buyerEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallBuyer.ICreate,
    });
  typia.assert(buyer);

  // Step 2: Define various special delivery instruction scenarios
  const deliveryInstructions = [
    {
      label: "Home with Gate Code",
      instructions:
        "Gate code: 1234#. Enter through main gate, proceed to building A.",
    },
    {
      label: "Office with Location Preference",
      instructions:
        "Leave packages at back door near loading dock. Do not use front entrance.",
    },
    {
      label: "Apartment with Availability",
      instructions:
        "Deliver after 5 PM weekdays. Ring apartment 5B for entry. Weekends anytime.",
    },
    {
      label: "House with Building Access",
      instructions:
        "Ring apartment 5B for entry. If no answer, leave with building concierge on ground floor.",
    },
    {
      label: "Complex Multi-Instruction",
      instructions:
        "Gate code: 9876#. Turn left after gate, building 3. Deliver to side entrance. Call 30 min before arrival. Safe to leave if not home - covered porch area.",
    },
  ];

  // Step 3: Create addresses with each instruction type and validate
  const createdAddresses: IShoppingMallBuyerAddress[] = [];

  for (const scenario of deliveryInstructions) {
    const addressData = {
      recipient_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      street_address_line1: `${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<9999>>()} ${RandomGenerator.name()} Street`,
      street_address_line2: `Apt ${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<999>>()}`,
      city: RandomGenerator.name(),
      state: RandomGenerator.name(),
      postal_code: typia
        .random<
          number &
            tags.Type<"uint32"> &
            tags.Minimum<10000> &
            tags.Maximum<99999>
        >()
        .toString(),
      country: "United States",
      address_label: scenario.label,
      address_type: RandomGenerator.pick([
        "residential",
        "commercial",
      ] as const),
      special_delivery_instructions: scenario.instructions,
      is_default: createdAddresses.length === 0,
    } satisfies IShoppingMallBuyerAddress.ICreate;

    // Verify instruction length is within 500-character limit
    TestValidator.predicate(
      "delivery instructions within 500 character limit",
      scenario.instructions.length <= 500,
    );

    const createdAddress: IShoppingMallBuyerAddress =
      await api.functional.shoppingMall.buyer.buyers.me.addresses.create(
        connection,
        {
          body: addressData,
        },
      );
    typia.assert(createdAddress);

    // Step 4: Validate that instruction text is accurately stored
    TestValidator.equals(
      "special delivery instructions match input",
      createdAddress.special_delivery_instructions,
      scenario.instructions,
    );

    TestValidator.equals(
      "address label matches",
      createdAddress.address_label,
      scenario.label,
    );

    TestValidator.equals(
      "recipient name preserved",
      createdAddress.recipient_name,
      addressData.recipient_name,
    );

    createdAddresses.push(createdAddress);
  }

  // Step 5: Verify all addresses were created successfully
  TestValidator.equals(
    "all delivery instruction scenarios created",
    createdAddresses.length,
    deliveryInstructions.length,
  );
}
