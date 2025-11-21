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

/**
 * Test creating material selection unit supporting premium materials,
 * eco-friendly options, and fabric compositions with multi-selection
 * capabilities. Validates that sellers can create sophisticated material
 * variation systems enabling customers to select multiple material preferences
 * for composite products while maintaining accurate cost calculations and
 * providing comprehensive sustainability information through detailed material
 * specifications expanding environmental consciousness and sophisticated
 * material science integration.
 */
export async function test_api_seller_product_unit_material_comprehensive(
  connection: api.IConnection,
) {
  // 1. Create materials specialist seller account
  const sellerData = {
    email: typia.random<string & tags.Format<"email">>(),
    business_name: `${RandomGenerator.name(2)} Materials Specialists`,
    business_registration_number: `BR${RandomGenerator.alphaNumeric(8).toUpperCase()}`,
    tax_id: `TAX${RandomGenerator.alphaNumeric(9).toUpperCase()}`,
    phone: RandomGenerator.mobile(),
    business_type: "corporation",
  } satisfies IShoppingMallSeller.IJoin;

  const sellerAccount = await api.functional.auth.seller.join(connection, {
    body: sellerData,
  });
  typia.assert(sellerAccount);

  TestValidator.predicate(
    "seller account created successfully",
    sellerAccount.business_type === "corporation",
  );

  // 2. Create material-based product for comprehensive testing
  const productSku = `MAT-${RandomGenerator.alphaNumeric(6).toUpperCase()}`;
  const productCreationData = {
    sku: productSku,
    name: `${RandomGenerator.name()} Premium Material Collection`,
    description: `High-performance composite materials featuring ${RandomGenerator.paragraph({ sentences: 4 })}`,
    price: 299.99,
    compare_at_price: null,
    cost: 150.5,
    condition: "new",
    weight: 1.5,
    weight_unit: "kg",
    barcode: null,
    track_quantity: true,
    allow_backorder: false,
    is_shipping_required: true,
    is_taxable: true,
    seo_title: RandomGenerator.paragraph({ sentences: 1 }),
    seo_description: RandomGenerator.paragraph({ sentences: 2 }),
    tags: "premium,composite,materials,sustainable",
    featured_image: null,
    category_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_seller_id: sellerAccount.id,
    variants: [],
    images: [],
    ip: "192.168.1.1",
    href: "https://example.com/shop/materials",
    referrer: "https://google.com/search/composite-materials",
  } satisfies IShoppingMallProduct.ICreate;

  const materialProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreationData,
    });
  typia.assert(materialProduct);

  TestValidator.equals(
    "product seller relation created",
    materialProduct.seller.id,
    sellerAccount.id,
  );

  // 3. Create premium materials unit (dropdown selection)
  const premiumMaterialsUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: materialProduct.sku,
      body: {
        name: "Premium Materials",
        type: "material",
        display_style: "dropdown",
        is_required: true,
        is_multiple: false,
        sort_order: 1,
      },
    });
  typia.assert(premiumMaterialsUnit);

  TestValidator.predicate(
    "premium materials unit has correct configuration",
    premiumMaterialsUnit.is_required === true &&
      premiumMaterialsUnit.is_multiple === false &&
      premiumMaterialsUnit.sort_order === 1,
  );

  // 4. Create eco-friendly options unit
  const ecoFriendlyUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: materialProduct.sku,
      body: {
        name: "Eco Options",
        type: "color",
        display_style: "dropdown",
        is_required: false,
        is_multiple: true,
        sort_order: 2,
      },
    });
  typia.assert(ecoFriendlyUnit);

  TestValidator.equals(
    "eco unit allows multiple selection",
    ecoFriendlyUnit.is_multiple,
    true,
  );
  TestValidator.equals(
    "eco unit is optional",
    ecoFriendlyUnit.is_required,
    false,
  );

  // 5. Create fabric composition unit (text_input display)
  const fabricCompositionUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: materialProduct.sku,
      body: {
        name: "Fabric Composition",
        type: "custom",
        display_style: "dropdown",
        is_required: true,
        is_multiple: false,
        sort_order: 3,
      },
    });
  typia.assert(fabricCompositionUnit);

  TestValidator.equals(
    "fabric unit type is custom",
    fabricCompositionUnit.type,
    "custom",
  );
  TestValidator.equals(
    "fabric unit is required",
    fabricCompositionUnit.is_required,
    true,
  );

  // 6. Create sustainability features unit (button selection)
  const sustainabilityUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: materialProduct.sku,
      body: {
        name: "Sustainability Features",
        type: "style",
        display_style: "dropdown",
        is_required: false,
        is_multiple: true,
        sort_order: 4,
      },
    });
  typia.assert(sustainabilityUnit);

  TestValidator.equals(
    "sustainability unit allows multiple features",
    sustainabilityUnit.is_multiple,
    true,
  );
  TestValidator.equals(
    "sustainability unit is optional",
    sustainabilityUnit.is_required,
    false,
  );
  TestValidator.equals(
    "sustainability display order is 4",
    sustainabilityUnit.sort_order,
    4,
  );

  // 7. Validate comprehensive unit system
  TestValidator.equals(
    "all units created for same product",
    [
      premiumMaterialsUnit.product.id,
      ecoFriendlyUnit.product.id,
      fabricCompositionUnit.product.id,
      sustainabilityUnit.product.id,
    ],
    ArrayUtil.repeat(4, () => materialProduct.id),
  );

  TestValidator.equals(
    "unit names are correctly set",
    [
      premiumMaterialsUnit.name,
      ecoFriendlyUnit.name,
      fabricCompositionUnit.name,
      sustainabilityUnit.name,
    ],
    [
      "Premium Materials",
      "Eco Options",
      "Fabric Composition",
      "Sustainability Features",
    ],
  );

  TestValidator.predicate(
    "all units have unique sort orders",
    premiumMaterialsUnit.sort_order !== ecoFriendlyUnit.sort_order &&
      ecoFriendlyUnit.sort_order !== fabricCompositionUnit.sort_order &&
      fabricCompositionUnit.sort_order !== sustainabilityUnit.sort_order,
  );

  // 8. Test error scenario - non-existent product code
  await TestValidator.error(
    "creating unit with invalid product code should fail",
    async () => {
      await api.functional.shoppingMall.seller.products.units.create(
        connection,
        {
          productCode: "INVALID-PRODUCT-CODE",
          body: {
            name: "Test Unit",
            type: "size",
            display_style: "dropdown",
            is_required: true,
            is_multiple: false,
            sort_order: 5,
          },
        },
      );
    },
  );

  // 9. Test error scenario - unauthorized seller (different seller connection)
  const unauthorizedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Note: This might fail during auth check rather than unit creation, depending on implementation
  await TestValidator.error(
    "unauthorized seller should not create units",
    async () => {
      await api.functional.shoppingMall.seller.products.units.create(
        unauthorizedConnection,
        {
          productCode: materialProduct.sku,
          body: {
            name: "Unauthorized Unit",
            type: "color",
            display_style: "dropdown",
            is_required: false,
            is_multiple: false,
            sort_order: 6,
          },
        },
      );
    },
  );
}
