import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleVariantAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleVariantAttribute";
import type { IShoppingMallSaleVariantValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleVariantValue";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test creating multiple variant attributes for a single product sale with
 * different display orders.
 *
 * This scenario validates that sellers can define multiple variation dimensions
 * (e.g., Color and Size) for products that have complex configurations. The
 * test ensures proper display ordering and correct association of multiple
 * attributes to the same sale.
 *
 * Workflow steps:
 *
 * 1. Authenticate as a new seller
 * 2. Create product category as admin
 * 3. Create a product sale listing
 * 4. Create first variant attribute (e.g., Color) with display_order: 0
 * 5. Create second variant attribute (e.g., Size) with display_order: 1
 *
 * Validation points:
 *
 * - Both variant attributes are created successfully
 * - Each attribute has unique ID but same shopping_mall_sale_id
 * - Display order values control presentation sequence (Color appears before
 *   Size)
 * - Attribute names are distinct and meaningful
 * - Both attributes are properly linked to the same sale
 * - Each creation returns complete attribute details with timestamps
 */
export async function test_api_variant_attribute_creation_with_multiple_attributes(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as a new seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.MinLength<8>>();

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        business_name: RandomGenerator.name(2),
        business_description: RandomGenerator.paragraph({ sentences: 5 }),
        store_name: RandomGenerator.name(2),
        ip: undefined,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // Step 2: Switch to admin actor and create category
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        admin_level: RandomGenerator.pick([
          "super_admin",
          "moderator",
          "support",
        ] as const),
        email_verified: true,
        ip: undefined,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        display_order: typia.random<number & tags.Type<"int32">>(),
        status: RandomGenerator.pick(["active", "inactive"] as const),
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(category);

  // Step 3: Switch back to seller and create product sale
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      ip: undefined,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });

  const sale: IShoppingMallSale =
    await api.functional.shoppingMall.seller.sales.create(connection, {
      body: {
        code: RandomGenerator.alphaNumeric(12),
        shopping_mall_category_id: category.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        condition: RandomGenerator.pick([
          "new",
          "refurbished",
          "used",
        ] as const),
        return_policy_days: RandomGenerator.pick([0, 7, 14, 30, 60] as const),
      } satisfies IShoppingMallSale.ICreate,
    });
  typia.assert(sale);

  // Step 4: Create first variant attribute (Color) with display_order: 0
  const colorAttribute: IShoppingMallSaleVariantAttribute =
    await api.functional.shoppingMall.seller.sales.variantAttributes.create(
      connection,
      {
        saleCode: sale.code,
        body: {
          name: "Color",
          display_order: 0,
        } satisfies IShoppingMallSaleVariantAttribute.ICreate,
      },
    );
  typia.assert(colorAttribute);

  // Step 5: Create second variant attribute (Size) with display_order: 1
  const sizeAttribute: IShoppingMallSaleVariantAttribute =
    await api.functional.shoppingMall.seller.sales.variantAttributes.create(
      connection,
      {
        saleCode: sale.code,
        body: {
          name: "Size",
          display_order: 1,
        } satisfies IShoppingMallSaleVariantAttribute.ICreate,
      },
    );
  typia.assert(sizeAttribute);

  // Validation: Both attributes created successfully with unique IDs
  TestValidator.predicate(
    "color attribute has unique ID",
    colorAttribute.id !== sizeAttribute.id,
  );

  // Validation: Both attributes linked to same sale
  TestValidator.equals(
    "color attribute linked to sale",
    colorAttribute.shopping_mall_sale_id,
    sale.id,
  );
  TestValidator.equals(
    "size attribute linked to sale",
    sizeAttribute.shopping_mall_sale_id,
    sale.id,
  );

  // Validation: Display order controls sequence
  TestValidator.equals(
    "color attribute display order is 0",
    colorAttribute.display_order,
    0,
  );
  TestValidator.equals(
    "size attribute display order is 1",
    sizeAttribute.display_order,
    1,
  );
  TestValidator.predicate(
    "color appears before size",
    colorAttribute.display_order < sizeAttribute.display_order,
  );

  // Validation: Attribute names are distinct
  TestValidator.equals("color attribute name", colorAttribute.name, "Color");
  TestValidator.equals("size attribute name", sizeAttribute.name, "Size");
  TestValidator.notEquals(
    "attribute names are different",
    colorAttribute.name,
    sizeAttribute.name,
  );

  // Validation: Both have timestamps
  TestValidator.predicate(
    "color attribute has creation timestamp",
    colorAttribute.created_at !== undefined &&
      colorAttribute.created_at.length > 0,
  );
  TestValidator.predicate(
    "size attribute has creation timestamp",
    sizeAttribute.created_at !== undefined &&
      sizeAttribute.created_at.length > 0,
  );
}
