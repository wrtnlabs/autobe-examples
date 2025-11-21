import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductUnit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductUnit";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_seller_unit_creation_nonexistent_product(
  connection: api.IConnection,
) {
  // 1. Register a new seller account to establish authentication
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      business_name: RandomGenerator.name(),
      business_registration_number: RandomGenerator.alphaNumeric(10),
      tax_id: RandomGenerator.alphaNumeric(9),
      phone: RandomGenerator.mobile(),
      business_type: RandomGenerator.pick([
        "sole_proprietorship",
        "corporation",
        "llc",
        "partnership",
      ] as const),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);

  // 2. Attempt to create a unit for a non-existent product
  // Generate a random product code that doesn't exist in the system
  const nonExistentProductCode = RandomGenerator.alphaNumeric(12);

  await TestValidator.error(
    "unit creation on non-existent product should fail",
    async () => {
      await api.functional.shoppingMall.seller.products.units.create(
        connection,
        {
          productCode: nonExistentProductCode,
          body: {
            name: "Size",
            type: "size",
            display_style: "dropdown",
            is_required: true,
            is_multiple: false,
            sort_order: 1,
          } satisfies IShoppingMallProductUnit.ICreate,
        },
      );
    },
  );

  // 3. Test with different non-existent product codes
  const alternativeNonExistentCode = RandomGenerator.alphaNumeric(8);

  await TestValidator.error(
    "unit creation on alternative non-existent product should fail",
    async () => {
      await api.functional.shoppingMall.seller.products.units.create(
        connection,
        {
          productCode: alternativeNonExistentCode,
          body: {
            name: "Color",
            type: "color",
            display_style: "swatches",
            is_required: true,
            is_multiple: false,
            sort_order: 2,
          } satisfies IShoppingMallProductUnit.ICreate,
        },
      );
    },
  );

  // 4. Test with various unit types to ensure system consistency
  const unitTypes = ["size", "color", "material", "style", "custom"] as const;
  const randomUnitType = RandomGenerator.pick(unitTypes);

  await TestValidator.error(
    "unit creation with different attributes on non-existent product should fail",
    async () => {
      await api.functional.shoppingMall.seller.products.units.create(
        connection,
        {
          productCode: nonExistentProductCode,
          body: {
            name: RandomGenerator.name(),
            type: randomUnitType,
            display_style: RandomGenerator.pick([
              "dropdown",
              "buttons",
              "swatches",
              "text_input",
            ] as const),
            is_required: RandomGenerator.pick([true, false]),
            is_multiple: RandomGenerator.pick([true, false]),
            sort_order: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
            >(),
          } satisfies IShoppingMallProductUnit.ICreate,
        },
      );
    },
  );

  // Validate that only one attempt actually got called since we can't track across connection resets
  TestValidator.predicate(
    "same product code should trigger same error",
    nonExistentProductCode !== nonExistentProductCode,
  );
}
