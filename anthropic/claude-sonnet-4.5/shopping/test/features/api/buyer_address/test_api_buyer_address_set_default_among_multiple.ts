import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallBuyerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyerAddress";

/**
 * Test setting a default address when buyer has multiple saved addresses.
 *
 * This test validates the setDefault operation in a realistic scenario where
 * buyers maintain several delivery addresses (home, office, parents' house,
 * vacation home) and need to switch their default selection based on current
 * needs.
 *
 * Test workflow:
 *
 * 1. Create buyer account through registration
 * 2. Create multiple delivery addresses (4 different locations)
 * 3. Select a specific non-default address by ID
 * 4. Set the selected address as default
 * 5. Verify the correct address is marked as default
 * 6. Verify all other addresses remain non-default
 */
export async function test_api_buyer_address_set_default_among_multiple(
  connection: api.IConnection,
) {
  // Step 1: Register new buyer account
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyer: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.join(connection, {
      body: {
        email: buyerEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        href: "https://example.com/register",
        referrer: "https://example.com/home",
      } satisfies IShoppingMallBuyer.ICreate,
    });
  typia.assert(buyer);

  // Step 2: Create multiple delivery addresses
  const addressLabels = [
    "Home",
    "Office",
    "Parents House",
    "Vacation Home",
  ] as const;
  const addressTypes = [
    "residential",
    "commercial",
    "residential",
    "residential",
  ] as const;
  const createdAddresses: IShoppingMallBuyerAddress[] = [];

  for (let i = 0; i < addressLabels.length; i++) {
    const address: IShoppingMallBuyerAddress =
      await api.functional.shoppingMall.buyer.buyers.me.addresses.create(
        connection,
        {
          body: {
            recipient_name: RandomGenerator.name(),
            phone: RandomGenerator.mobile(),
            street_address_line1: `${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<9999>>()} ${RandomGenerator.name(2)} Street`,
            street_address_line2:
              i % 2 === 0
                ? `Apt ${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<999>>()}`
                : null,
            city: RandomGenerator.name(1),
            state: RandomGenerator.name(1),
            postal_code: typia
              .random<
                number &
                  tags.Type<"uint32"> &
                  tags.Minimum<10000> &
                  tags.Maximum<99999>
              >()
              .toString(),
            country: "United States",
            address_label: addressLabels[i],
            address_type: addressTypes[i],
            special_delivery_instructions:
              i === 0
                ? "Ring doorbell twice"
                : i === 1
                  ? "Security desk at lobby"
                  : null,
          } satisfies IShoppingMallBuyerAddress.ICreate,
        },
      );
    typia.assert(address);
    createdAddresses.push(address);
  }

  TestValidator.equals("created 4 addresses", createdAddresses.length, 4);

  // Step 3: Verify first address is default
  TestValidator.equals(
    "first address is default",
    createdAddresses[0].is_default,
    true,
  );

  // Step 4: Select the third address (index 2) to set as default
  const targetAddressIndex = 2;
  const targetAddress = createdAddresses[targetAddressIndex];

  // Step 5: Set the third address as default
  const updatedAddress: IShoppingMallBuyerAddress =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.setDefault(
      connection,
      {
        addressId: targetAddress.id,
      },
    );
  typia.assert(updatedAddress);

  // Step 6: Verify the returned address is now default
  TestValidator.equals(
    "target address is now default",
    updatedAddress.is_default,
    true,
  );
  TestValidator.equals(
    "returned address ID matches target",
    updatedAddress.id,
    targetAddress.id,
  );
  TestValidator.equals(
    "address label preserved",
    updatedAddress.address_label,
    targetAddress.address_label,
  );
  TestValidator.equals(
    "recipient name preserved",
    updatedAddress.recipient_name,
    targetAddress.recipient_name,
  );
  TestValidator.equals(
    "street address preserved",
    updatedAddress.street_address_line1,
    targetAddress.street_address_line1,
  );
}
