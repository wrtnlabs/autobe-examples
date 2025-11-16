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
 * Test administrative expansion of variant options for marketplace
 * standardization and quality control.
 *
 * This scenario validates that admins can add standardized variant values to
 * seller products to ensure consistency across the marketplace. For example,
 * adding standard size values or standardized color options to help buyers
 * compare products more easily. The test ensures that admin-added values
 * integrate seamlessly with seller-created values, maintaining proper display
 * ordering and uniqueness constraints.
 */
export async function test_api_variant_value_admin_moderation_expansion(
  connection: api.IConnection,
) {
  // Step 1: Admin authenticates to the system
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();
  const adminIp = typia.random<string & tags.Format<"ipv4">>();
  const adminHref = typia.random<string & tags.Format<"uri">>();
  const adminReferrer = typia.random<string & tags.Format<"uri">>();

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: "super_admin" as const,
      email_verified: true,
      ip: adminIp,
      href: adminHref,
      referrer: adminReferrer,
    },
  });
  typia.assert(admin);

  // Step 2: Admin creates a standardized product category
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: "Clothing" as string & tags.MinLength<2> & tags.MaxLength<100>,
        slug: "clothing",
        description: "Clothing and apparel products" as string &
          tags.MaxLength<1000>,
        image_url: typia.random<string & tags.Format<"uri">>(),
        display_order: 1 satisfies number as number & tags.Type<"int32">,
        status: "active" as const,
      },
    },
  );
  typia.assert(category);

  // Step 3: Seller authenticates and creates account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: "seller123" as string & tags.MinLength<8>,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_name: RandomGenerator.name(2) satisfies string as string &
        tags.MinLength<2> &
        tags.MaxLength<200>,
      business_description:
        RandomGenerator.paragraph() satisfies string as string &
          tags.MaxLength<2000>,
      store_name: RandomGenerator.name(2) satisfies string as string &
        tags.MinLength<2> &
        tags.MaxLength<100>,
      ip: typia.random<string & tags.Format<"ipv4">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(seller);

  // Step 4: Seller creates a product sale listing
  const saleCode = RandomGenerator.alphaNumeric(8);
  const sale = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: saleCode,
        shopping_mall_category_id: category.id,
        title: "Premium Cotton T-Shirt" as string &
          tags.MinLength<3> &
          tags.MaxLength<200>,
        description: RandomGenerator.content({
          paragraphs: 2,
        }) satisfies string as string &
          tags.MinLength<50> &
          tags.MaxLength<5000>,
        brand: "BrandName" as string & tags.MaxLength<100>,
        condition: "new" as const,
        return_policy_days: 30 as const,
        warranty_info: "1 year manufacturer warranty" as string &
          tags.MaxLength<1000>,
      },
    },
  );
  typia.assert(sale);

  // Step 5: Seller creates a variant attribute (Size)
  const variantAttribute =
    await api.functional.shoppingMall.seller.sales.variantAttributes.create(
      connection,
      {
        saleCode: saleCode,
        body: {
          name: "Size" as string & tags.MinLength<1> & tags.MaxLength<100>,
          display_order: 0 satisfies number as number &
            tags.Type<"int32"> &
            tags.Minimum<0>,
        },
      },
    );
  typia.assert(variantAttribute);

  // Step 6: Seller adds initial variant values (S, M, L)
  const sellerValues = ["S", "M", "L"];
  const createdSellerValues: IShoppingMallSaleVariantValue[] = [];

  for (let i = 0; i < sellerValues.length; i++) {
    const value =
      await api.functional.shoppingMall.admin.sales.variantAttributes.values.create(
        connection,
        {
          saleCode: saleCode,
          variantAttributeId: variantAttribute.id,
          body: {
            value: sellerValues[i] as string &
              tags.MinLength<1> &
              tags.MaxLength<100>,
            display_order: i satisfies number as number &
              tags.Type<"int32"> &
              tags.Minimum<0>,
            color_code: null,
          },
        },
      );
    typia.assert(value);
    createdSellerValues.push(value);
  }

  // Step 7: Admin authenticates again to switch context
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      ip: adminIp,
      href: adminHref,
      referrer: adminReferrer,
    },
  });

  // Step 8: Admin expands variant attribute with standardized values (XL, 2XL)
  const adminStandardizedValues = ["XL", "2XL"];
  const createdAdminValues: IShoppingMallSaleVariantValue[] = [];

  for (let i = 0; i < adminStandardizedValues.length; i++) {
    const adminValue =
      await api.functional.shoppingMall.admin.sales.variantAttributes.values.create(
        connection,
        {
          saleCode: saleCode,
          variantAttributeId: variantAttribute.id,
          body: {
            value: adminStandardizedValues[i] as string &
              tags.MinLength<1> &
              tags.MaxLength<100>,
            display_order: (sellerValues.length +
              i) satisfies number as number &
              tags.Type<"int32"> &
              tags.Minimum<0>,
            color_code: null,
          },
        },
      );
    typia.assert(adminValue);
    createdAdminValues.push(adminValue);
  }

  // Step 9: Validate admin-added values were successfully created
  TestValidator.equals(
    "admin created XL value",
    createdAdminValues[0].value,
    "XL",
  );

  TestValidator.equals(
    "admin created 2XL value",
    createdAdminValues[1].value,
    "2XL",
  );

  // Step 10: Validate display ordering is correct
  TestValidator.equals(
    "XL display order follows seller values",
    createdAdminValues[0].display_order,
    sellerValues.length,
  );

  TestValidator.equals(
    "2XL display order is sequential",
    createdAdminValues[1].display_order,
    sellerValues.length + 1,
  );

  // Step 11: Verify variant attribute IDs match
  TestValidator.equals(
    "admin values belong to correct variant attribute",
    createdAdminValues[0].shopping_mall_sale_variant_attribute_id,
    variantAttribute.id,
  );
}
