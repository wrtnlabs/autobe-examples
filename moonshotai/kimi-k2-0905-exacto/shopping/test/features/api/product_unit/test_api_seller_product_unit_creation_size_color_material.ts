import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallInventoryStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryStatus";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductReviewStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewStatistics";
import type { IShoppingMallProductUnit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductUnit";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_seller_product_unit_creation_size_color_material(
  connection: api.IConnection,
) {
  // Step 1: Authenticate seller account for product configuration
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      business_name: RandomGenerator.name(),
      business_registration_number: RandomGenerator.alphaNumeric(10),
      tax_id: RandomGenerator.alphaNumeric(9),
      phone: RandomGenerator.mobile("010"),
      business_type: RandomGenerator.pick([
        "sole_proprietorship",
        "corporation",
        "llc",
        "partnership",
      ] as const),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);

  // Step 2: Create parent product for unit assignment
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        sku: `CUST-TSH-${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1000> & tags.Maximum<9999>>()}`,
        name: "Premium Cotton T-Shirt - Customizable",
        description: RandomGenerator.paragraph({
          sentences: 8,
          wordMin: 4,
          wordMax: 10,
        }),
        price: typia.random<number & tags.Minimum<10> & tags.Maximum<100>>(),
        condition: RandomGenerator.pick([
          "new",
          "used",
          "refurbished",
        ] as const),
        weight:
          typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<1000>
          >() * 0.1,
        weight_unit: RandomGenerator.pick(["kg", "g", "lb", "oz"] as const),
        track_quantity: true,
        allow_backorder: false,
        is_shipping_required: true,
        is_taxable: true,
        category_id: typia.random<string & tags.Format<"uuid">>(),
        shopping_mall_seller_id: seller.id,
        href: "https://example.com/seller/dashboard/products/create",
        referrer: "https://example.com/seller/dashboard/products",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // Step 3: Create Size unit (dropdown display for dimensional characteristics)
  const sizeUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: product.sku,
      body: {
        name: "Size",
        type: "size",
        display_style: "dropdown",
        is_required: true,
        is_multiple: false,
        sort_order: 1, // Dimensional characteristics first
      } satisfies IShoppingMallProductUnit.ICreate,
    });
  typia.assert(sizeUnit);

  // Step 4: Create Color unit (swatches display for accurate representation)
  const colorUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: product.sku,
      body: {
        name: "Color",
        type: "color",
        display_style: "swatches",
        is_required: true,
        is_multiple: false,
        sort_order: 2, // Aesthetic choices after dimensional
      } satisfies IShoppingMallProductUnit.ICreate,
    });
  typia.assert(colorUnit);

  // Step 5: Create Material unit (buttons display for intuitive selection)
  const materialUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: product.sku,
      body: {
        name: "Material",
        type: "material",
        display_style: "buttons",
        is_required: true,
        is_multiple: false,
        sort_order: 3, // Material properties last
      } satisfies IShoppingMallProductUnit.ICreate,
    });
  typia.assert(materialUnit);

  // Step 6: Validate unit configuration integrity and business relationships
  TestValidator.equals("size unit name", sizeUnit.name, "Size");
  TestValidator.equals("color unit type", colorUnit.type, "color");
  TestValidator.equals(
    "material display style",
    materialUnit.display_style,
    "buttons",
  );

  // Step 7: Verify required field enforcement and customer experience
  TestValidator.predicate(
    "size is required" satisfies string as string,
    sizeUnit.is_required === true,
  );
  TestValidator.predicate(
    "color is required" satisfies string as string,
    colorUnit.is_required === true,
  );
  TestValidator.predicate(
    "material is required" satisfies string as string,
    materialUnit.is_required === true,
  );

  // Step 8: Validate sort order management for logical configuration workflow
  TestValidator.notEquals(
    "size and color sort order differ",
    sizeUnit.sort_order,
    colorUnit.sort_order,
  );
  TestValidator.notEquals(
    "color and material sort order differ",
    colorUnit.sort_order,
    materialUnit.sort_order,
  );

  // Step 9: Confirm display style optimization
  TestValidator.predicate(
    "size uses dropdown for compact selection" satisfies string as string,
    sizeUnit.display_style === "dropdown",
  );
  TestValidator.predicate(
    "color uses swatches for accurate display" satisfies string as string,
    colorUnit.display_style === "swatches",
  );
  TestValidator.predicate(
    "material uses buttons for intuitive interface" satisfies string as string,
    materialUnit.display_style === "buttons",
  );

  // Step 10: Verify inventory granularity support and parent relationship
  TestValidator.equals("size has correct type", sizeUnit.type, "size");
  TestValidator.equals("color has correct type", colorUnit.type, "color");
  TestValidator.equals(
    "material has correct type",
    materialUnit.type,
    "material",
  );
  TestValidator.equals(
    "size unit has corresponding product ID",
    sizeUnit.product.id,
    product.id,
  );
  TestValidator.equals(
    "color unit has corresponding product ID",
    colorUnit.product.id,
    product.id,
  );
  TestValidator.equals(
    "material unit has corresponding product ID",
    materialUnit.product.id,
    product.id,
  );

  // Step 11: Validate date format for audit trail and system integrity
  TestValidator.predicate(
    "size unit created_at is valid ISO date" satisfies string as string,
    sizeUnit.created_at.includes("T") && sizeUnit.created_at.includes("Z"),
  );
  TestValidator.predicate(
    "color unit updated_at is valid ISO date" satisfies string as string,
    colorUnit.updated_at.includes("T") && colorUnit.updated_at.includes("Z"),
  );
  TestValidator.predicate(
    "material unit timestamp consistency" satisfies string as string,
    new Date(materialUnit.created_at).getTime() <=
      new Date(materialUnit.updated_at).getTime(),
  );
}
