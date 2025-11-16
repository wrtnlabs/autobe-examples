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
 * Test variant attribute creation with specific focus on display_order
 * functionality.
 *
 * This test validates that sellers can control the order in which variant
 * selectors are presented to buyers by using the display_order field. It
 * verifies that:
 *
 * - Multiple variant attributes can be created with different display_order
 *   values
 * - Non-consecutive values (0, 3, 5) are properly accepted and stored
 * - Lower values indicate earlier presentation (0 first, then 3, then 5)
 * - All attributes correctly belong to the same sale
 *
 * Business workflow:
 *
 * 1. Authenticate as seller
 * 2. Create category as admin
 * 3. Create product sale
 * 4. Create variant attribute with display_order: 5
 * 5. Create variant attribute with display_order: 0
 * 6. Create variant attribute with display_order: 3
 * 7. Validate all attributes have correct display_order and sale references
 */
export async function test_api_variant_attribute_creation_display_order_sequencing(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as seller
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
        business_description: RandomGenerator.paragraph({ sentences: 10 }),
        store_name: RandomGenerator.name(2),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // Step 2: Create and authenticate as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: typia.random<string & tags.Format<"password">>(),
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        admin_level: RandomGenerator.pick([
          "super_admin",
          "moderator",
          "support",
        ] as const),
        email_verified: true,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 3: Admin creates category
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name: RandomGenerator.name(1),
        slug: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<0>
        >(),
        status: RandomGenerator.pick(["active", "inactive"] as const),
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(category);

  // Step 4: Switch back to seller and create product sale
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });

  const sale: IShoppingMallSale =
    await api.functional.shoppingMall.seller.sales.create(connection, {
      body: {
        code: RandomGenerator.alphaNumeric(12),
        shopping_mall_category_id: category.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
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

  // Step 5: Create variant attribute with display_order: 5
  const attribute1: IShoppingMallSaleVariantAttribute =
    await api.functional.shoppingMall.seller.sales.variantAttributes.create(
      connection,
      {
        saleCode: sale.code,
        body: {
          name: "Material",
          display_order: 5,
        } satisfies IShoppingMallSaleVariantAttribute.ICreate,
      },
    );
  typia.assert(attribute1);
  TestValidator.equals(
    "attribute1 display_order should be 5",
    attribute1.display_order,
    5,
  );
  TestValidator.equals(
    "attribute1 should belong to the sale",
    attribute1.shopping_mall_sale_id,
    sale.id,
  );

  // Step 6: Create variant attribute with display_order: 0
  const attribute2: IShoppingMallSaleVariantAttribute =
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
  typia.assert(attribute2);
  TestValidator.equals(
    "attribute2 display_order should be 0",
    attribute2.display_order,
    0,
  );
  TestValidator.equals(
    "attribute2 should belong to the sale",
    attribute2.shopping_mall_sale_id,
    sale.id,
  );

  // Step 7: Create variant attribute with display_order: 3
  const attribute3: IShoppingMallSaleVariantAttribute =
    await api.functional.shoppingMall.seller.sales.variantAttributes.create(
      connection,
      {
        saleCode: sale.code,
        body: {
          name: "Size",
          display_order: 3,
        } satisfies IShoppingMallSaleVariantAttribute.ICreate,
      },
    );
  typia.assert(attribute3);
  TestValidator.equals(
    "attribute3 display_order should be 3",
    attribute3.display_order,
    3,
  );
  TestValidator.equals(
    "attribute3 should belong to the sale",
    attribute3.shopping_mall_sale_id,
    sale.id,
  );

  // Step 8: Validate ordering logic - lower display_order appears first
  TestValidator.predicate(
    "Color (0) should appear before Size (3)",
    attribute2.display_order < attribute3.display_order,
  );
  TestValidator.predicate(
    "Size (3) should appear before Material (5)",
    attribute3.display_order < attribute1.display_order,
  );
  TestValidator.predicate(
    "Color (0) should appear before Material (5)",
    attribute2.display_order < attribute1.display_order,
  );
}
